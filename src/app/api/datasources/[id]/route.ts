import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, verifyOwnership } from '@/lib/auth-utils';
import fs from 'fs';

// GET /api/datasources/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireAuth();

    const datasource = await db.dataSource.findUnique({
      where: { id },
      include: {
        schemas: true,
        contexts: true,
      },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Verify ownership
    const isOwner = await verifyOwnership(datasource.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ datasource });
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
    await requireAuth();

    const datasource = await db.dataSource.findUnique({
      where: { id },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Verify ownership
    const isOwner = await verifyOwnership(datasource.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the file
    if (fs.existsSync(datasource.filePath)) {
      fs.unlinkSync(datasource.filePath);
    }

    // Delete the database record (cascades will handle related records)
    await db.dataSource.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error deleting datasource:', error);
    return NextResponse.json({ error: 'Failed to delete data source' }, { status: 500 });
  }
}
