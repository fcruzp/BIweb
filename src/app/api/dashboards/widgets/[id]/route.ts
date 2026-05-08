import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/dashboards/widgets/[id] - Update a widget
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.widgetType !== undefined) updateData.widgetType = body.widgetType;
    if (body.dataSourceId !== undefined) updateData.dataSourceId = body.dataSourceId || null;
    if (body.sqlQuery !== undefined) updateData.sqlQuery = body.sqlQuery || null;
    if (body.visualization !== undefined) updateData.visualization = body.visualization ? JSON.stringify(body.visualization) : null;
    if (body.config !== undefined) updateData.config = body.config ? JSON.stringify(body.config) : JSON.stringify({});
    if (body.positionX !== undefined) updateData.positionX = body.positionX;
    if (body.positionY !== undefined) updateData.positionY = body.positionY;
    if (body.width !== undefined) updateData.width = body.width;
    if (body.height !== undefined) updateData.height = body.height;

    const widget = await db.dashboardWidget.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ widget });
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 });
  }
}

// DELETE /api/dashboards/widgets/[id] - Delete a widget
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.dashboardWidget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
