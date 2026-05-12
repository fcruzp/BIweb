/**
 * Stripe Mock Configuration
 *
 * This module provides a Stripe integration that works in MOCK mode
 * (no real Stripe API calls) and can be switched to LIVE mode
 * when the Stripe secret key is configured.
 *
 * Set STRIPE_SECRET_KEY in .env to activate live mode.
 * Without it, all operations return mock responses.
 */

export const STRIPE_MODE = process.env.STRIPE_SECRET_KEY ? 'live' : 'mock' as const;
export type StripeMode = 'live' | 'mock';

// Plan price IDs — these will be created in Stripe when going live
// For mock mode, we use placeholder IDs
export const STRIPE_PRICE_IDS: Record<string, { monthly: string; yearly: string }> = {
  free: { monthly: 'price_free_monthly', yearly: 'price_free_yearly' },
  supporter: { monthly: 'price_supporter_monthly', yearly: 'price_supporter_yearly' },
  starter: { monthly: 'price_starter_monthly', yearly: 'price_starter_yearly' },
  pro: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
  business: { monthly: 'price_business_monthly', yearly: 'price_business_yearly' },
};

// Plan prices in cents (for Stripe)
export const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  supporter: { monthly: 100, yearly: 1100 },      // $1/mo, $11/yr
  starter: { monthly: 900, yearly: 9700 },         // $9/mo, $97/yr
  pro: { monthly: 2900, yearly: 31300 },           // $29/mo, $313/yr
  business: { monthly: 9900, yearly: 106900 },     // $99/mo, $1,069/yr
};

export function isStripeLive(): boolean {
  return STRIPE_MODE === 'live';
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
