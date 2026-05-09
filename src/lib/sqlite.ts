import fs from 'fs';

// ============================================================
// Runtime Detection & Database Adapter
// ============================================================

const isBun = typeof (globalThis as Record<string, unknown>).Bun !== 'undefined';

type DatabaseConnection = {
  prepare(sql: string): { all(...params: unknown[]): Array<Record<string, unknown>>; get(...params: unknown[]): Record<string, unknown> | undefined };
  query(sql: string): { all(...params: unknown[]): Array<Record<string, unknown>>; get(...params: unknown[]): Record<string, unknown> | undefined };
  pragma(sql: string): Array<Record<string, unknown>>;
  close(): void;
};

function openDatabase(filePath: string, options?: { readonly?: boolean }): DatabaseConnection {
  if (isBun) {
    // Bun runtime — use bun:sqlite
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Database } = require('bun:sqlite');
    const db = new Database(filePath, { readonly: options?.readonly ?? false });

    return {
      prepare(sql: string) {
        const stmt = db.prepare(sql);
        return {
          all(...params: unknown[]) { return stmt.all(...params) as Array<Record<string, unknown>>; },
          get(...params: unknown[]) { return stmt.get(...params) as Record<string, unknown> | undefined; },
        };
      },
      query(sql: string) {
        const stmt = db.query(sql);
        return {
          all(...params: unknown[]) { return stmt.all(...params) as Array<Record<string, unknown>>; },
          get(...params: unknown[]) { return stmt.get(...params) as Record<string, unknown> | undefined; },
        };
      },
      pragma(sql: string) {
        // bun:sqlite doesn't have .pragma(), use query instead
        return db.query(`PRAGMA ${sql}`).all() as Array<Record<string, unknown>>;
      },
      close() { db.close(); },
    };
  } else {
    // Node.js runtime — use better-sqlite3
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const db = new Database(filePath, { readonly: options?.readonly ?? false });

    return {
      prepare(sql: string) {
        const stmt = db.prepare(sql);
        return {
          all(...params: unknown[]) { return stmt.all(...params) as Array<Record<string, unknown>>; },
          get(...params: unknown[]) { return stmt.get(...params) as Record<string, unknown> | undefined; },
        };
      },
      query(sql: string) {
        const stmt = db.prepare(sql);
        return {
          all(...params: unknown[]) { return stmt.all(...params) as Array<Record<string, unknown>>; },
          get(...params: unknown[]) { return stmt.get(...params) as Record<string, unknown> | undefined; },
        };
      },
      pragma(sql: string) {
        return db.pragma(sql) as Array<Record<string, unknown>>;
      },
      close() { db.close(); },
    };
  }
}

// ============================================================
// Types
// ============================================================

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  sampleData: Array<Record<string, unknown>>;
}

export interface SchemaExtractionResult {
  tables: TableSchema[];
  fullSchemaText: string;
}

// ============================================================
// Schema Extraction
// ============================================================

/**
 * Opens a SQLite database file (read-only) and extracts schema information
 */
export function extractSchema(filePath: string): SchemaExtractionResult {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Database file not found: ${filePath}`);
  }

  const db = openDatabase(filePath, { readonly: true });

  try {
    // Get all table names
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as Array<{ name: string }>;

    const tableSchemas: TableSchema[] = [];
    const schemaParts: string[] = [];

    for (const { name } of tables) {
      // Get column info using PRAGMA
      const columns = db.pragma(`table_info("${name}")`) as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }>;

      const columnInfos: ColumnInfo[] = columns.map((col) => ({
        name: col.name,
        type: col.type || 'TEXT',
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
      }));

      // Get row count
      let rowCount = 0;
      try {
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get() as { count: number } | undefined;
        rowCount = countResult?.count ?? 0;
      } catch {
        // Some tables might not be queryable
      }

      // Get sample data (up to 5 rows)
      let sampleData: Array<Record<string, unknown>> = [];
      try {
        sampleData = db.prepare(`SELECT * FROM "${name}" LIMIT 5`).all() as Array<Record<string, unknown>>;
      } catch {
        // Some tables might not be queryable
      }

      tableSchemas.push({
        name,
        columns: columnInfos,
        rowCount,
        sampleData,
      });

      // Build schema text for AI context
      const columnDefs = columnInfos
        .map((c) => `  ${c.name} ${c.type}${c.primaryKey ? ' PRIMARY KEY' : ''}${c.notNull ? ' NOT NULL' : ''}`)
        .join('\n');
      schemaParts.push(`TABLE ${name} (\n${columnDefs}\n) -- ${rowCount} rows`);
    }

    return {
      tables: tableSchemas,
      fullSchemaText: schemaParts.join('\n\n'),
    };
  } finally {
    db.close();
  }
}

// ============================================================
// Query Execution
// ============================================================

/**
 * Executes a safe SELECT query on a SQLite database file
 */
export function executeSelectQuery(
  filePath: string,
  sql: string,
  maxRows: number = 1000
): {
  data: Array<Record<string, unknown>>;
  columns: string[];
  rowCount: number;
  executionTime: number;
} {
  const db = openDatabase(filePath, { readonly: true });

  try {
    // Apply row limit if not already present
    const limitedSql = addLimitToQuery(sql, maxRows);

    const startTime = Date.now();
    const data = db.prepare(limitedSql).all() as Array<Record<string, unknown>>;
    const executionTime = Date.now() - startTime;

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return {
      data,
      columns,
      rowCount: data.length,
      executionTime,
    };
  } finally {
    db.close();
  }
}

/**
 * Adds LIMIT clause to a query if not already present
 */
function addLimitToQuery(sql: string, maxRows: number): string {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.includes('LIMIT')) {
    return sql;
  }
  // Add LIMIT before any trailing semicolon
  return sql.replace(/;\s*$/, '') + ` LIMIT ${maxRows}`;
}

// ============================================================
// Description Generators
// ============================================================

/**
 * Generates a formatted schema description for AI context
 */
export function generateSchemaDescription(tables: TableSchema[]): string {
  return tables
    .map((table) => {
      const cols = table.columns
        .map(
          (c) =>
            `- ${c.name} (${c.type})${c.primaryKey ? ' [PK]' : ''}${c.notNull ? ' [NOT NULL]' : ''}`
        )
        .join('\n');
      return `### ${table.name} (${table.rowCount} rows)\n${cols}`;
    })
    .join('\n\n');
}

/**
 * Generates sample data description for AI context
 */
export function generateSampleDataDescription(tables: TableSchema[]): string {
  return tables
    .filter((t) => t.sampleData.length > 0)
    .map((table) => {
      const rows = table.sampleData
        .map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`)
        .join('\n');
      return `### ${table.name} (sample)\n${rows}`;
    })
    .join('\n\n');
}
