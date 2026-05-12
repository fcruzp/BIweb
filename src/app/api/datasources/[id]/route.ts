import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { findFilePath } from '@/lib/file-utils';
import fs from 'fs';

// GET /api/datasources/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const startTime = Date.now();
  try {
    console.log(`[Schema] ⏱ START: datasource=${id}`);

    const t0 = Date.now();
    const user = await requireAuth();
    console.log(`[Schema] ⏱ Auth: ${Date.now() - t0}ms (user=${user.id})`);

    const t1 = Date.now();
    const datasource = await db.dataSource.findUnique({
      where: { id },
      include: {
        schemas: true,
        contexts: true,
      },
    });
    console.log(`[Schema] ⏱ DB query: ${Date.now() - t1}ms (found=${!!datasource})`);

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // OPTIMIZATION: Use user.id directly instead of verifyOwnership()
    // which makes 2 extra Supabase round trips (auth + user lookup)
    if (datasource.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the file still exists
    const resolvedPath = findFilePath(datasource.filePath);
    const fileExists = resolvedPath !== null;

    console.log(`[Schema] ⏱ TOTAL: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      datasource: {
        ...datasource,
        fileExists,  // Let the frontend know if the file is accessible
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching datasource:', error);
    return NextResponse.json({ error: 'Failed to fetch data source' }, { status: 500 });
  }
}

// DELETE /api/datasources/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await requireAuth();

    const datasource = await db.dataSource.findUnique({
      where: { id },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // OPTIMIZATION: Use user.id directly instead of verifyOwnership()
    if (datasource.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the file — use resolveFilePath for robustness
    const resolvedPath = findFilePath(datasource.filePath);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }

    // Delete DashboardWidgets that reference this dataSource
    // (not a Prisma relation, so no cascade — must delete manually)
    const deletedWidgets = await db.dashboardWidget.deleteMany({
      where: { dataSourceId: id },
    });

    // Delete the database record (cascades handle schemas, contexts, sessions, messages, queries)
    await db.dataSource.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deletedWidgets: deletedWidgets.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error deleting datasource:', error);
    return NextResponse.json({ error: 'Failed to delete data source' }, { status: 500 });
  }
}
