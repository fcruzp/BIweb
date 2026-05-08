import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/chat/sessions/[id] - Rename a chat session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const existing = await db.chatSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = await db.chatSession.update({
      where: { id },
      data: { title: title.trim() },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// DELETE /api/chat/sessions/[id] - Delete a chat session and its messages
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.chatSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Cascade delete will handle messages and query history
    await db.chatSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
