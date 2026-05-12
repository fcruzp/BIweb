import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { createCheckoutSession } from '@/lib/stripe/service'
import { PLANS } from '@/lib/plans'

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for plan upgrade.
 * In mock mode, returns a simulated checkout URL.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { planId, billingPeriod = 'monthly' } = body as {
      planId: string
      billingPeriod?: 'monthly' | 'yearly'
    }

    // Validate plan
    if (!PLANS[planId]) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    // Can't downgrade to free via checkout
    if (planId === 'free') {
      return NextResponse.json(
        { error: 'Cannot checkout free plan. Use the portal to cancel.' },
        { status: 400 }
      )
    }

    const session = await createCheckoutSession(planId, billingPeriod)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      mode: session.mode,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    console.error('[stripe/checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
