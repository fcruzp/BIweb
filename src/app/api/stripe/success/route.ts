import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { handleCheckoutComplete } from '@/lib/stripe/service'
import { isStripeLive } from '@/lib/stripe/config'

/**
 * Derive the public origin URL from request headers.
 * Handles reverse proxies (Caddy, Nginx, Cloudflare, etc.) that set
 * X-Forwarded-Host / X-Forwarded-Proto headers.
 * Falls back to request.url origin if no proxy headers are present.
 */
function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('host')

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`
  }

  if (forwardedHost) {
    // Default to https if no proto specified (production usually is https)
    return `https://${forwardedHost}`
  }

  if (host) {
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    return `${proto}://${host}`
  }

  // Last resort: use request.url origin
  return new URL(request.url).origin
}

/**
 * GET /api/stripe/success
 *
 * Handles the redirect after a successful Stripe Checkout.
 * In BOTH mock and live modes, this endpoint:
 *   1. Authenticates the user (via cookies)
 *   2. Processes the checkout (updates subscription in DB)
 *   3. Redirects to /?billing=success
 *
 * In live mode, the Stripe webhook also handles the update asynchronously,
 * but this serves as a synchronous fallback.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const planId = searchParams.get('plan')
  const period = searchParams.get('period') as 'monthly' | 'yearly' | null

  // Try to process the checkout with the authenticated user
  try {
    const user = await requireAuth()

    if (planId && period) {
      await handleCheckoutComplete(user.id, planId, period)
    }
  } catch (err) {
    // If auth fails or processing fails, still redirect to app
    // The user can retry from the usage plan dialog
    console.error('[stripe/success] Error processing checkout:', err)
  }

  // Redirect to app with success indicator
  const origin = getPublicOrigin(request)
  return NextResponse.redirect(new URL('/?billing=success', origin))
}
