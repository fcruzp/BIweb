import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';

// GET /api/datasources/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
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

    return NextResponse.json({ datasource });
  } catch (error) {
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
    const datasource = await db.dataSource.findUnique({
      where: { id },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
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
    console.error('Error deleting datasource:', error);
    return NextResponse.json({ error: 'Failed to delete data source' }, { status: 500 });
  }
}
