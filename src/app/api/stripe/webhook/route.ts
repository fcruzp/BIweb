import { NextRequest, NextResponse } from 'next/server'
import { handleCheckoutComplete } from '@/lib/stripe/service'
import { isStripeLive } from '@/lib/stripe/config'
import { db } from '@/lib/db'
import { getSupabaseAuthUser } from '@/lib/auth-utils'

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events.
 * In mock mode, this is called by the mock portal (cancel/reactivate).
 * In live mode, this receives real Stripe webhook events.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()

  if (isStripeLive()) {
    // LIVE MODE — Verify webhook signature
    const sig = request.headers.get('stripe-signature')
    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

      const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Record<string, unknown>
          const userId = (session.metadata as Record<string, string>)?.userId
          const planId = (session.metadata as Record<string, string>)?.planId
          const billingPeriod = (session.metadata as Record<string, string>)?.billingPeriod as 'monthly' | 'yearly'

          if (userId && planId) {
            await handleCheckoutComplete(
              userId,
              planId,
              billingPeriod ?? 'monthly',
              session.customer as string | undefined,
              session.subscription as string | undefined
            )
          }
          break
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Record<string, unknown>
          const stripeCustomerId = subscription.customer as string

          // Find user by stripe customer ID
          const userSub = await db.subscription.findFirst({
            where: { stripeCustomerId },
          })

          if (userSub) {
            await db.subscription.update({
              where: { userId: userSub.userId },
              data: {
                status: subscription.status === 'active' ? 'active' : String(subscription.status),
                cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
                currentPeriodEnd: subscription.current_period_end
                  ? new Date(subscription.current_period_end as number * 1000)
                  : undefined,
              },
            })
          }
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Record<string, unknown>
          const stripeCustomerId = subscription.customer as string

          const deletedSub = await db.subscription.findFirst({
            where: { stripeCustomerId },
          })

          if (deletedSub) {
            await db.subscription.update({
              where: { userId: deletedSub.userId },
              data: {
                plan: 'free',
                status: 'canceled',
                cancelAtPeriodEnd: false,
              },
            })
          }
          break
        }
      }

      return NextResponse.json({ received: true })
    } catch (err) {
      console.error('[stripe/webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  // MOCK MODE — Accept mock events directly
  // Used by mock-portal for cancel/reactivate actions
  try {
    const event = JSON.parse(body)
    const { type, planId, billingPeriod, reactivate } = event as {
      type: string
      userId?: string
      planId?: string
      billingPeriod?: 'monthly' | 'yearly'
      reactivate?: boolean
    }

    if (type === 'checkout.session.completed' && planId) {
      // Try to get user from auth context (cookies)
      const authUser = await getSupabaseAuthUser()
      if (authUser) {
        await handleCheckoutComplete(
          authUser.id,
          planId,
          billingPeriod ?? 'monthly'
        )
      }
    }

    if (type === 'customer.subscription.deleted') {
      // Cancel subscription — get user from auth context
      const authUser = await getSupabaseAuthUser()
      if (authUser) {
        const subscription = await db.subscription.findUnique({
          where: { userId: authUser.id },
        })
        if (subscription) {
          await db.subscription.update({
            where: { userId: authUser.id },
            data: {
              plan: 'free',
              status: 'canceled',
              cancelAtPeriodEnd: false,
            },
          })
        }
      }
    }

    if (type === 'customer.subscription.updated' && reactivate) {
      // Reactivate subscription — get user from auth context
      const authUser = await getSupabaseAuthUser()
      if (authUser) {
        const subscription = await db.subscription.findUnique({
          where: { userId: authUser.id },
        })
        if (subscription) {
          await db.subscription.update({
            where: { userId: authUser.id },
            data: {
              status: 'active',
              cancelAtPeriodEnd: false,
            },
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[stripe/webhook] Mock webhook error:', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
