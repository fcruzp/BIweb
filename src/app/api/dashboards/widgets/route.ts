import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';

// POST /api/dashboards/widgets - Create a new widget
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      dashboardId,
      title,
      widgetType,
      dataSourceId,
      sqlQuery,
      visualization,
      config,
      positionX,
      positionY,
      width,
      height,
    } = body;

    if (!dashboardId || !title || !widgetType) {
      return NextResponse.json(
        { error: 'dashboardId, title, and widgetType are required' },
        { status: 400 }
      );
    }

    // Verify dashboard exists
    const dashboard = await db.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // OPTIMIZATION: Direct comparison instead of verifyOwnership()
    if (dashboard.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const widget = await db.dashboardWidget.create({
      data: {
        dashboardId,
        title,
        widgetType,
        dataSourceId: dataSourceId || null,
        sqlQuery: sqlQuery || null,
        visualization: visualization ? JSON.stringify(visualization) : null,
        config: config ? JSON.stringify(config) : JSON.stringify({}),
        positionX: positionX ?? 0,
        positionY: positionY ?? 0,
        width: width ?? 6,
        height: height ?? 4,
      },
    });

    return NextResponse.json({ widget }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error creating widget:', error);
    return NextResponse.json({ error: 'Failed to create widget' }, { status: 500 });
  }
}

// GET /api/dashboards/widgets?dashboardId=xxx - List widgets for a dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('dashboardId');

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'dashboardId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify dashboard exists
    const dashboard = await db.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // OPTIMIZATION: Direct comparison instead of verifyOwnership()
    if (dashboard.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const widgets = await db.dashboardWidget.findMany({
      where: { dashboardId },
      orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
    });

    return NextResponse.json({ widgets });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching widgets:', error);
    return NextResponse.json({ error: 'Failed to fetch widgets' }, { status: 500 });
  }
}
