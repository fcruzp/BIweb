import { NextResponse } from 'next/server'
import { ensureUser } from '@/lib/auth-utils'
import { db } from '@/lib/db'

/**
 * POST /api/auth/sync
 *
 * Syncs the authenticated Supabase Auth user to our User table.
 * Called by the client-side useAuth hook when a user signs in.
 *
 * This endpoint:
 * 1. Verifies the Supabase Auth session (via cookies)
 * 2. Creates a new User record if one doesn't exist (supabaseId match)
 * 3. Updates email/name/avatarUrl from Supabase Auth metadata
 * 4. Returns our internal User record with subscription info
 */
export async function POST() {
  try {
    const user = await ensureUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch subscription info for the client
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: {
        plan: true,
        status: true,
      },
    })

    return NextResponse.json({ user, subscription })
  } catch (error) {
    console.error('[auth/sync] Error syncing user:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
