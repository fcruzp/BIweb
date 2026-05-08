import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/chat/sessions/[id]/messages - Get all messages for a session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.chatSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const messages = await db.chatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
