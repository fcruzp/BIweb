import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/chat/sessions - List chat sessions for a data source (filtered by user)
// OPTIMIZED: Removed messages include + redundant ownership check (userId is in findMany where clause)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const user = await requireAuth();
    console.log(`[ChatSessions] ⏱ Auth: ${Date.now() - startTime}ms`);

    const { searchParams } = new URL(request.url);
    const dataSourceId = searchParams.get('dataSourceId');

    if (!dataSourceId) {
      return NextResponse.json({ error: 'dataSourceId is required' }, { status: 400 });
    }

    // Single query — no separate ownership check needed since userId is in the where clause
    // If the user doesn't own the dataSource, findMany will simply return 0 results
    const t1 = Date.now();
    const sessions = await db.chatSession.findMany({
      where: { dataSourceId, userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        dataSourceId: true,
        createdAt: true,
        updatedAt: true,
        // NO messages — sidebar only needs session metadata
      },
    });
    console.log(`[ChatSessions] ⏱ DB query: ${Date.now() - t1}ms, count=${sessions.length}`);
    console.log(`[ChatSessions] ⏱ TOTAL: ${Date.now() - startTime}ms`);

    return NextResponse.json({ sessions });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/chat/sessions - Create a new chat session (with userId)
export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { dataSourceId, title } = body;

    if (!dataSourceId) {
      return NextResponse.json({ error: 'dataSourceId is required' }, { status: 400 });
    }

    // Verify data source exists and belongs to the user
    const dataSource = await db.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // OPTIMIZATION: Direct comparison instead of verifyOwnership()
    if (dataSource.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const session = await db.chatSession.create({
      data: {
        dataSourceId,
        userId: user.id,
        title: title || 'New Chat',
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
