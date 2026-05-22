import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/admin/promote
 *
 * Promotes a user to admin role. Requires X-Admin-Key header matching
 * ADMIN_SECRET_KEY env var. If ADMIN_SECRET_KEY is not set, this
 * endpoint is DISABLED.
 *
 * Usage:
 *   curl -X POST https://your-domain.com/api/admin/promote \
 *     -H "X-Admin-Key: your-secret-key" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email": "user@example.com"}'
 */
export async function POST(request: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { error: 'Admin promotion is disabled. Set ADMIN_SECRET_KEY env var to enable.' },
      { status: 403 }
    );
  }

  const providedKey = request.headers.get('x-admin-key');
  if (providedKey !== adminKey) {
    return NextResponse.json(
      { error: 'Invalid admin key' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: `User with email "${email}" not found` },
        { status: 404 }
      );
    }

    if (user.role === 'admin') {
      return NextResponse.json({
        success: true,
        message: `User ${email} is already an admin`,
        userId: user.id,
        role: user.role,
      });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
    });

    console.log(`[Admin/Promote] User ${email} promoted to admin`);

    return NextResponse.json({
      success: true,
      message: `User ${email} promoted to admin`,
      userId: updated.id,
      role: updated.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Admin/Promote] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
