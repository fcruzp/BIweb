import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { openDatabase } from '@/lib/sqlite';
import { resolveFilePath } from '@/lib/file-utils';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/schema/table-data?dataSourceId=...&tableName=...&page=1&pageSize=10
export async function GET(request: NextRequest) {
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
    const user = await requireAuth();

    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr || '10', 10) || 10));

    // Find the datasource to get the filePath
    const datasource = await db.dataSource.findUnique({
      where: { id: dataSourceId },
      select: { filePath: true, userId: true },
    });

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

    // Resolve the file path (handles different deployment environments)
    const resolvedPath = resolveFilePath(datasource.filePath);
    const sqliteDb = openDatabase(resolvedPath, { readonly: true });

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
    console.error('Error fetching table data:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch table data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
