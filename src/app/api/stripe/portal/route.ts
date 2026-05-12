import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { createPortalSession } from '@/lib/stripe/service'

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * In mock mode, returns a simulated portal URL.
 */
export async function POST() {
  try {
    const user = await requireAuth()

    const session = await createPortalSession()

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    console.error('[stripe/portal] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
