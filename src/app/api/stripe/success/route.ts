import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleCheckoutComplete } from '@/lib/stripe/service'
import { isStripeLive } from '@/lib/stripe/config'

/**
 * GET /api/stripe/success
 *
 * Handles the redirect after a successful Stripe Checkout.
 * In mock mode, the webhook is called from the mock checkout page.
 * In live mode, this just redirects — the webhook handles the actual update.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!isStripeLive()) {
    // MOCK MODE — The mock checkout page already called the webhook.
    // Just redirect to the app.
    return NextResponse.redirect(new URL('/?billing=success', request.url))
  }

  // LIVE MODE — In live mode, the webhook handles the update asynchronously.
  // But we can also do a synchronous update here as a fallback.
  try {
    const user = await requireAuth()
    const planId = searchParams.get('plan')
    const period = searchParams.get('period') as 'monthly' | 'yearly' | null

    if (planId && period) {
      await handleCheckoutComplete(user.id, planId, period)
    }
  } catch {
    // Non-critical: webhook will handle it
  }

  return NextResponse.redirect(new URL('/?billing=success', request.url))
}
