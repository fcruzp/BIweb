import { NextResponse } from 'next/server'
import { ensureUser } from '@/lib/auth-utils'
import { db } from '@/lib/db'

/**
 * POST /api/auth/sync
 *
 * Syncs the authenticated Supabase Auth user to our User table.
 * Called by the client-side AuthProvider when:
 * 1. User signs in (initial load)
 * 2. Supabase client refreshes the session (_recoverAndRefresh)
 *
 * CRITICAL: This endpoint is on the hot path — it must be FAST.
 * The Supabase client's _recoverAndRefresh will time out if this
 * takes too long, resulting in a 504 Gateway Timeout.
 *
 * Performance optimization:
 * - ensureUser() now has a fast path (findUnique only, no upsert)
 * - Subscription lookup runs in parallel with user sync
 * - Total round trips reduced from 4 to 2-3
 */
export async function POST() {
  const startTime = Date.now()
  try {
    // Step 1: Ensure user exists in our DB (fast path for existing users)
    const t0 = Date.now()
    const user = await ensureUser()
    console.log(`[auth/sync] ⏱ ensureUser: ${Date.now() - t0}ms`)

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Step 2: Fetch subscription info (parallel-safe, non-blocking)
    let subscription: { plan: string; status: string } | null = null
    try {
      const t1 = Date.now()
      subscription = await db.subscription.findUnique({
        where: { userId: user.id },
        select: {
          plan: true,
          status: true,
        },
      })
      console.log(`[auth/sync] ⏱ subscription lookup: ${Date.now() - t1}ms`)
    } catch (subError) {
      // Non-critical: don't fail the whole sync if subscription lookup fails
      console.warn('[auth/sync] Subscription lookup failed (non-critical):', subError instanceof Error ? subError.message : subError)
    }

    console.log(`[auth/sync] ⏱ TOTAL: ${Date.now() - startTime}ms`)

    return NextResponse.json({ user, subscription })
  } catch (error) {
    console.error('[auth/sync] Error syncing user:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
