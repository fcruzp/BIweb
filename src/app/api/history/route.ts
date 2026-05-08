import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/history - Get query history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataSourceId = searchParams.get('dataSourceId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = dataSourceId ? { dataSourceId } : {};

    const history = await db.queryHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
