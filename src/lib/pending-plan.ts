/**
 * Pending Plan Utility
 *
 * When a user clicks a paid plan CTA on the landing page before signing up,
 * we store the selected planId so we can auto-trigger checkout after they
 * complete registration + onboarding.
 *
 * Uses sessionStorage (not localStorage) so it clears when the browser tab
 * closes — we don't want a stale plan hanging around forever.
 */

const PENDING_PLAN_KEY = 'datamind_pending_upgrade_plan';

export type PlanId = string;

/** Save the plan the user wants to upgrade to after registration */
export function setPendingUpgradePlan(planId: PlanId): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_PLAN_KEY, planId);
  } catch {
    // sessionStorage not available (incognito, etc.)
  }
}

/** Get the pending plan (if any) */
export function getPendingUpgradePlan(): PlanId | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(PENDING_PLAN_KEY);
  } catch {
    return null;
  }
}

/** Clear the pending plan after checkout is initiated */
export function clearPendingUpgradePlan(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_PLAN_KEY);
  } catch {
    // Ignore
  }
}
