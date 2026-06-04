import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

/**
 * GET /api/auth/user
 *
 * Returns the current authenticated user from our User table.
 * Returns null if not authenticated.
 *
 * This endpoint:
 * 1. Verifies the Supabase Auth session (via cookies)
 * 2. Looks up our internal User record by supabaseId
 * 3. Returns the User record or null
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      )
    }

    return NextResponse.json({
      user,
      authenticated: true,
    })
  } catch (error) {
    console.error('[auth/user] Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
