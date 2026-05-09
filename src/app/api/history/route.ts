import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/history - Get query history (filtered by user's data sources)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const dataSourceId = searchParams.get('dataSourceId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get all data source IDs that belong to this user
    const userDataSources = await db.dataSource.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const userDsIds = userDataSources.map((ds) => ds.id);

    // If a specific dataSourceId is requested, verify it belongs to the user
    if (dataSourceId) {
      if (!userDsIds.includes(dataSourceId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Build where clause: always filter by user's data source IDs
    const where =
      dataSourceId
        ? { dataSourceId }
        : { dataSourceId: { in: userDsIds } };

    const history = await db.queryHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ history });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
