import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db } from '@/lib/db'

/**
 * DELETE /api/settings/api-keys/[id]
 *
 * Soft-revokes an API key (sets `revokedAt`). The key immediately stops
 * working for public API requests but remains in the audit trail.
 *
 * Ownership check: the key must belong to the authenticated user.
 * Already-revoked keys return 200 (idempotent) rather than 404.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    const apiKey = await db.apiKey.findUnique({
      where: { id },
      select: { id: true, userId: true, revokedAt: true },
    })

    if (!apiKey || apiKey.userId !== user.id) {
      // 404 for both "not found" and "not yours" — avoid ownership oracle.
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (apiKey.revokedAt) {
      // Idempotent: revoking an already-revoked key is a no-op.
      return NextResponse.json({ ok: true, alreadyRevoked: true })
    }

    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { revokedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api-keys] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
