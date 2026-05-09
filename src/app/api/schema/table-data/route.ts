import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { openDatabase } from '@/lib/sqlite';
import { resolveFilePath } from '@/lib/file-utils';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/schema/table-data?dataSourceId=...&tableName=...&page=1&pageSize=10
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const dataSourceId = searchParams.get('dataSourceId');
  const tableName = searchParams.get('tableName');
  const pageStr = searchParams.get('page');
  const pageSizeStr = searchParams.get('pageSize');

  if (!dataSourceId || !tableName) {
    return NextResponse.json(
      { error: 'dataSourceId and tableName are required' },
      { status: 400 }
    );
  }

  // Validate tableName — only allow alphanumeric, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(tableName)) {
    return NextResponse.json(
      { error: 'Invalid table name' },
      { status: 400 }
    );
  }

  try {
    // Step 1: Auth
    const t0 = Date.now();
    const user = await requireAuth();
    console.log(`[table-data] ⏱ Auth: ${Date.now() - t0}ms (user=${user.id})`);

    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr || '10', 10) || 10));

    // Step 2: Find the datasource
    const t1 = Date.now();
    const datasource = await db.dataSource.findUnique({
      where: { id: dataSourceId },
      select: { filePath: true, userId: true, name: true },
    });
    console.log(`[table-data] ⏱ Fetch datasource: ${Date.now() - t1}ms (found=${!!datasource})`);

    if (!datasource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // OPTIMIZATION: Direct comparison instead of verifyOwnership()
    if (datasource.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Step 3: Resolve file path
    let resolvedPath: string;
    try {
      const t2 = Date.now();
      resolvedPath = resolveFilePath(datasource.filePath);
      console.log(`[table-data] ⏱ Resolve path: ${Date.now() - t2}ms → ${resolvedPath}`);
    } catch (resolveErr) {
      console.error(`[table-data] File not found for datasource "${datasource.name}" (id=${dataSourceId}): storedPath="${datasource.filePath}"`, resolveErr instanceof Error ? resolveErr.message : resolveErr);
      return NextResponse.json(
        {
          error: 'Database file not found. The file may have been lost during deployment. Please re-upload the database.',
          detail: resolveErr instanceof Error ? resolveErr.message : String(resolveErr),
        },
        { status: 404 }
      );
    }

    // Step 4: Open database and query
    let sqliteDb;
    try {
      sqliteDb = openDatabase(resolvedPath, { readonly: true });
    } catch (openErr) {
      console.error(`[table-data] Failed to open database at "${resolvedPath}":`, openErr instanceof Error ? openErr.message : openErr);
      return NextResponse.json(
        {
          error: 'Failed to open database file. It may be corrupted or in an unsupported format.',
          detail: openErr instanceof Error ? openErr.message : String(openErr),
        },
        { status: 500 }
      );
    }

    try {
      // Get total row count
      const countResult = sqliteDb
        .prepare(`SELECT COUNT(*) as count FROM "${tableName}"`)
        .get() as { count: number } | undefined;
      const totalRows = countResult?.count ?? 0;

      // Get paginated data
      const offset = (page - 1) * pageSize;
      const data = sqliteDb
        .prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`)
        .all(pageSize, offset) as Array<Record<string, unknown>>;

      // Extract column names from the first row (or empty if no data)
      const columns = data.length > 0 ? Object.keys(data[0]) : [];

      const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

      console.log(`[table-data] ✅ Done: ${data.length} rows, ${totalRows} total, ${Date.now() - startTime}ms total`);

      return NextResponse.json({
        data,
        columns,
        totalRows,
        page,
        pageSize,
        totalPages,
      });
    } finally {
      sqliteDb.close();
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('[table-data] ❌ Error fetching table data:', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : '');
    const message = error instanceof Error ? error.message : 'Failed to fetch table data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
