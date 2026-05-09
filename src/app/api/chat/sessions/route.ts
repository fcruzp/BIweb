import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';

// GET /api/chat/sessions - List chat sessions for a data source (filtered by user)
export async function GET(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataSourceId = searchParams.get('dataSourceId');

    if (!dataSourceId) {
      return NextResponse.json({ error: 'dataSourceId is required' }, { status: 400 });
    }

    // Verify the data source belongs to the user
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

    const sessions = await db.chatSession.findMany({
      where: { dataSourceId, userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        dataSourceId: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { content: true },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
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
