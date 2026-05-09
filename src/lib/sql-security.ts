import { Parser } from 'node-sql-parser';

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
  'TRUNCATE', 'REPLACE', 'ATTACH', 'DETACH', 'PRAGMA',
  'REINDEX', 'VACUUM', 'ANALYZE',
];

const FORBIDDEN_FUNCTIONS = [
  'load_extension', 'writefile', 'readfile', 'fts3',
  'fts4', 'rtree', 'dbstat',
];

export interface SQLValidationResult {
  isValid: boolean;
  isSafe: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates and sanitizes a SQL query to ensure it's a safe SELECT statement
 */
export function validateSQLQuery(sql: string): SQLValidationResult {
  const result: SQLValidationResult = {
    isValid: true,
    isSafe: true,
    errors: [],
    warnings: [],
  };

  const trimmedSql = sql.trim();
  if (!trimmedSql) {
    result.isValid = false;
    result.isSafe = false;
    result.errors.push('Empty SQL query');
    return result;
  }

  // Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // Use word boundary check
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(trimmedSql)) {
      result.isSafe = false;
      result.errors.push(`Forbidden keyword: ${keyword}. Only SELECT queries are allowed.`);
    }
  }

  // Check for forbidden functions
  const upperSql = trimmedSql.toUpperCase();
  for (const func of FORBIDDEN_FUNCTIONS) {
    if (upperSql.includes(func.toUpperCase())) {
      result.isSafe = false;
      result.errors.push(`Forbidden function: ${func}`);
    }
  }

  // Check for semicolons (prevent multi-statement injection)
  const statements = trimmedSql.split(';').filter((s) => s.trim().length > 0);
  if (statements.length > 1) {
    result.isSafe = false;
    result.errors.push('Multiple SQL statements are not allowed');
  }

  // Check for comments that might hide malicious code
  if (trimmedSql.includes('--') || trimmedSql.includes('/*')) {
    result.warnings.push('SQL contains comments');
  }

  // Try to parse the SQL
  try {
    const parser = new Parser();
    const ast = parser.astify(trimmedSql);

    if (Array.isArray(ast)) {
      result.isSafe = false;
      result.errors.push('Multiple SQL statements are not allowed');
      return result;
    }

    // Check that it's a SELECT statement
    if (ast.type !== 'select') {
      result.isSafe = false;
      result.errors.push(`Only SELECT queries are allowed. Got: ${ast.type}`);
    }
  } catch {
    // If parsing fails, it might be invalid SQL
    // But some valid SQLite syntax might not parse with this library
    result.warnings.push('SQL could not be fully parsed - proceeding with keyword-based validation');
  }

  // Must start with SELECT (after trimming)
  if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('WITH')) {
    result.isSafe = false;
    result.errors.push('Query must start with SELECT or WITH (CTE)');
  }

  // If WITH (CTE), check that the main query is SELECT
  if (upperSql.startsWith('WITH')) {
    // CTEs are allowed as long as they end with a SELECT
    const lastSelect = upperSql.lastIndexOf('SELECT');
    if (lastSelect === -1) {
      result.isSafe = false;
      result.errors.push('CTE must end with a SELECT statement');
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Sanitizes a SQL query string - removes trailing semicolons and whitespace
 */
export function sanitizeSQL(sql: string): string {
  return sql.trim().replace(/;\s*$/, '');
}
