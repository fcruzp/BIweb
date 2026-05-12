/**
 * Stripe Mock Service
 *
 * Simulates Stripe checkout, portal, and webhook operations.
 * Returns realistic mock responses that the UI can use.
 * When STRIPE_SECRET_KEY is set, real Stripe calls are used instead.
 */

import { isStripeLive, STRIPE_PRICE_IDS, PLAN_PRICES } from './config';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';

interface CheckoutSession {
  id: string;
  url: string;
  mode: 'payment' | 'subscription';
  status: string;
  metadata: Record<string, string>;
}

interface PortalSession {
  id: string;
  url: string;
}

/**
 * Create a checkout session for plan upgrade.
 * In mock mode, returns a simulated checkout URL.
 * In live mode, creates a real Stripe Checkout session.
 */
export async function createCheckoutSession(
  planId: string,
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
): Promise<CheckoutSession> {
  if (isStripeLive()) {
    return createLiveCheckoutSession(planId, billingPeriod);
  }

  // MOCK MODE — simulate checkout
  const priceId = STRIPE_PRICE_IDS[planId]?.[billingPeriod] ?? 'price_unknown';
  const price = PLAN_PRICES[planId]?.[billingPeriod] ?? 0;

  const sessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // In mock mode, we redirect to a mock checkout page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const mockUrl = `${baseUrl}/api/stripe/mock-checkout?session_id=${sessionId}&plan=${planId}&period=${billingPeriod}&price=${price}`;

  return {
    id: sessionId,
    url: mockUrl,
    mode: 'subscription',
    status: 'open',
    metadata: {
      planId,
      billingPeriod,
      priceId,
    },
  };
}

/**
 * Create a Stripe Customer Portal session.
 * In mock mode, returns a simulated portal URL.
 */
export async function createPortalSession(): Promise<PortalSession> {
  if (isStripeLive()) {
    return createLivePortalSession();
  }

  // MOCK MODE — simulate portal
  const sessionId = `bps_mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const mockUrl = `${baseUrl}/api/stripe/mock-portal?session_id=${sessionId}`;

  return {
    id: sessionId,
    url: mockUrl,
  };
}

/**
 * Handle a successful checkout (mock webhook or real webhook).
 * Updates the user's subscription in the database.
 */
export async function handleCheckoutComplete(
  userId: string,
  planId: string,
  billingPeriod: 'monthly' | 'yearly',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<void> {
  const priceId = STRIPE_PRICE_IDS[planId]?.[billingPeriod];

  // Upsert subscription record
  const existing = await db.subscription.findUnique({ where: { userId } });

  if (existing) {
    await db.subscription.update({
      where: { userId },
      data: {
        plan: planId,
        status: 'active',
        stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId: stripeSubscriptionId ?? existing.stripeSubscriptionId,
        stripePriceId: priceId ?? existing.stripePriceId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          billingPeriod === 'monthly'
            ? Date.now() + 30 * 24 * 60 * 60 * 1000
            : Date.now() + 365 * 24 * 60 * 60 * 1000
        ),
        cancelAtPeriodEnd: false,
      },
    });
  } else {
    await db.subscription.create({
      data: {
        userId,
        plan: planId,
        status: 'active',
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId: priceId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          billingPeriod === 'monthly'
            ? Date.now() + 30 * 24 * 60 * 60 * 1000
            : Date.now() + 365 * 24 * 60 * 60 * 1000
        ),
      },
    });
  }
}

/**
 * Cancel a subscription (mark for cancellation at period end).
 */
export async function cancelSubscription(userId: string): Promise<void> {
  await db.subscription.update({
    where: { userId },
    data: {
      cancelAtPeriodEnd: true,
    },
  });
}

/**
 * Reactivate a cancelled subscription.
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  await db.subscription.update({
    where: { userId },
    data: {
      cancelAtPeriodEnd: false,
    },
  });
}

// ============================================================
// Live Stripe implementations (called when STRIPE_SECRET_KEY is set)
// ============================================================

async function createLiveCheckoutSession(
  planId: string,
  billingPeriod: 'monthly' | 'yearly'
): Promise<CheckoutSession> {
  const user = await requireAuth();
  const priceId = STRIPE_PRICE_IDS[planId]?.[billingPeriod];

  if (!priceId) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  // Dynamic import to avoid loading Stripe SDK in mock mode
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Get or create Stripe customer
  const subscription = await db.subscription.findUnique({ where: { userId: user.id } });
  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?billing=cancelled`,
    metadata: { userId: user.id, planId, billingPeriod },
  });

  return {
    id: session.id,
    url: session.url ?? '',
    mode: 'subscription',
    status: session.status ?? 'open',
    metadata: { planId, billingPeriod, priceId },
  };
}

async function createLivePortalSession(): Promise<PortalSession> {
  const user = await requireAuth();
  const subscription = await db.subscription.findUnique({ where: { userId: user.id } });

  if (!subscription?.stripeCustomerId) {
    throw new Error('No Stripe customer ID found');
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${baseUrl}/`,
  });

  return {
    id: session.id,
    url: session.url,
  };
}
