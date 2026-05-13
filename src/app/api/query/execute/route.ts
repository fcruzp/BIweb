import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { executeSelectQuery } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';
import { requireAuth } from '@/lib/auth-utils';

// POST /api/query/execute - Execute a validated SQL query directly
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[QueryExecute] === START ===');

  try {
    console.log('[QueryExecute] Step 1: Checking auth...');
    const user = await requireAuth();
    console.log(`[QueryExecute] Auth OK: user=${user.id}`);

    const body = await request.json();
    const { sql, dataSourceId } = body;
    console.log(`[QueryExecute] Request: sql="${sql?.slice(0, 100)}", dataSourceId=${dataSourceId}`);

    if (!sql || !dataSourceId) {
      console.warn('[QueryExecute] Missing required params');
      return NextResponse.json({ error: 'SQL and dataSourceId are required' }, { status: 400 });
    }

    // Get data source
    console.log(`[QueryExecute] Step 2: Fetching datasource ${dataSourceId}...`);
    const datasource = await db.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!datasource) {
      console.error(`[QueryExecute] Datasource NOT FOUND: ${dataSourceId}`);
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    console.log(`[QueryExecute] Datasource found: name="${datasource.name}", filePath="${datasource.filePath}"`);

    // Verify the data source belongs to the authenticated user
    // OPTIMIZATION: Use user.id directly instead of calling verifyOwnership() which re-fetches from Supabase
    const isOwner = datasource.userId === user.id;
    if (!isOwner) {
      console.warn('[QueryExecute] Ownership check FAILED');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate SQL
    const validation = validateSQLQuery(sql);
    if (!validation.isSafe) {
      console.warn(`[QueryExecute] SQL validation FAILED: ${validation.errors.join(', ')}`);
      return NextResponse.json(
        { error: 'Query validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Execute (resolveFilePath is now handled inside executeSelectQuery)
    console.log('[QueryExecute] Step 3: Executing SQL...');
    const sanitizedSQL = sanitizeSQL(sql);
    const result = executeSelectQuery(datasource.filePath, sanitizedSQL);

    console.log(`[QueryExecute] === END === OK: ${result.rowCount} rows, ${result.executionTime}ms, total=${Date.now() - startTime}ms`);

    return NextResponse.json({
      data: result.data,
      columns: result.columns,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      console.warn('[QueryExecute] Auth required');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const errMsg = error instanceof Error ? error.message : 'Query execution failed';
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error(`[QueryExecute] === FAILED === after ${Date.now() - startTime}ms:`, errMsg, errStack?.slice(0, 300));
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
