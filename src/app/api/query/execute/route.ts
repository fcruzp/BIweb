import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeSelectQuery } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';
import { requireAuth, verifyOwnership } from '@/lib/auth-utils';

// POST /api/query/execute - Execute a validated SQL query directly
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { sql, dataSourceId, queryRowLimit } = await request.json();

    if (!sql || !dataSourceId) {
      return NextResponse.json({ error: 'SQL and dataSourceId are required' }, { status: 400 });
    }

    // Get data source
    const datasource = await db.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Verify the data source belongs to the authenticated user
    const isOwner = await verifyOwnership(datasource.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate SQL
    const validation = validateSQLQuery(sql);
    if (!validation.isSafe) {
      return NextResponse.json(
        { error: 'Query validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Execute (resolveFilePath is now handled inside executeSelectQuery)
    const sanitizedSQL = sanitizeSQL(sql);
    const result = executeSelectQuery(datasource.filePath, sanitizedSQL);

    // Determine row limit for response slicing (0 = no limit)
    const responseRowLimit = typeof queryRowLimit === 'number' ? queryRowLimit : 500;
    const slicedData = responseRowLimit > 0
      ? result.data.slice(0, responseRowLimit)
      : result.data;

    return NextResponse.json({
      data: slicedData,
      columns: result.columns,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error executing query:', error);
    const message = error instanceof Error ? error.message : 'Query execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
