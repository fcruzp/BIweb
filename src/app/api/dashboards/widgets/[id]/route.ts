import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, verifyOwnership } from '@/lib/auth-utils';

// PUT /api/dashboards/widgets/[id] - Update a widget
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await requireAuth();

    // Fetch the widget to find its dashboard
    const existingWidget = await db.dashboardWidget.findUnique({
      where: { id },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Fetch the dashboard to check ownership
    const dashboard = await db.dashboard.findUnique({
      where: { id: existingWidget.dashboardId },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const isOwner = await verifyOwnership(dashboard.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
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
    const user = await requireAuth();

    // Fetch the widget to find its dashboard
    const existingWidget = await db.dashboardWidget.findUnique({
      where: { id },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    // Fetch the dashboard to check ownership
    const dashboard = await db.dashboard.findUnique({
      where: { id: existingWidget.dashboardId },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const isOwner = await verifyOwnership(dashboard.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.dashboardWidget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error deleting widget:', error);
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
