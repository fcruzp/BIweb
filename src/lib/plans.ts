/**
 * Plan Configuration & Usage Limits
 *
 * Defines the subscription tiers, their limits, and feature access.
 * Used by both frontend (paywall UI) and backend (enforcement middleware).
 *
 * Plans: Free → Supporter → Starter → Pro → Business
 */

export type PlanId = 'free' | 'supporter' | 'starter' | 'pro' | 'business';

export interface PlanConfig {
  id: PlanId;
  name: string;
  nameEs: string;
  price: number; // USD per month
  priceDisplay: string;
  /** Max queries per billing period (null = unlimited) */
  maxQueries: number | null;
  /** Max data sources */
  maxDataSources: number | null;
  /** Max total storage in MB */
  maxStorageMB: number | null;
  /** Max chat sessions per data source */
  maxChatSessions: number | null;
  /** Max dashboards */
  maxDashboards: number | null;
  /** Max export rows per query */
  maxExportRows: number | null;
  /** Can share dashboards */
  canShare: boolean;
  /** Can use AI analysis */
  canAnalyze: boolean;
  /** Can use custom API keys */
  canUseCustomKeys: boolean;
  /** Priority support */
  prioritySupport: boolean;
  /** Stripe Price ID (set when Stripe is configured) */
  stripePriceId?: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    nameEs: 'Gratis',
    price: 0,
    priceDisplay: '$0',
    maxQueries: 50,
    maxDataSources: 1,
    maxStorageMB: 5,
    maxChatSessions: 5,
    maxDashboards: 1,
    maxExportRows: 100,
    canShare: false,
    canAnalyze: true,
    canUseCustomKeys: false,
    prioritySupport: false,
  },
  supporter: {
    id: 'supporter',
    name: 'Supporter',
    nameEs: 'Soporte',
    price: 1,
    priceDisplay: '$1',
    maxQueries: 100,
    maxDataSources: 1,
    maxStorageMB: 25,
    maxChatSessions: 10,
    maxDashboards: 2,
    maxExportRows: 500,
    canShare: false,
    canAnalyze: true,
    canUseCustomKeys: false,
    prioritySupport: false,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    nameEs: 'Inicial',
    price: 9,
    priceDisplay: '$9',
    maxQueries: 500,
    maxDataSources: 3,
    maxStorageMB: 50,
    maxChatSessions: 25,
    maxDashboards: 5,
    maxExportRows: 5000,
    canShare: false,
    canAnalyze: true,
    canUseCustomKeys: true,
    prioritySupport: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    nameEs: 'Pro',
    price: 29,
    priceDisplay: '$29',
    maxQueries: null,
    maxDataSources: 10,
    maxStorageMB: 500,
    maxChatSessions: null,
    maxDashboards: 25,
    maxExportRows: null,
    canShare: true,
    canAnalyze: true,
    canUseCustomKeys: true,
    prioritySupport: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    nameEs: 'Empresa',
    price: 99,
    priceDisplay: '$99',
    maxQueries: null,
    maxDataSources: null,
    maxStorageMB: null,
    maxChatSessions: null,
    maxDashboards: null,
    maxExportRows: null,
    canShare: true,
    canAnalyze: true,
    canUseCustomKeys: true,
    prioritySupport: true,
  },
};

/** Ordered list of plan IDs from lowest to highest */
export const PLAN_ORDER: PlanId[] = ['free', 'supporter', 'starter', 'pro', 'business'];

/** Get plan config by ID (defaults to free) */
export function getPlan(planId: string | null | undefined): PlanConfig {
  return PLANS[(planId as PlanId) ?? 'free'] ?? PLANS.free;
}

/** Check if a plan has a specific feature */
export function planHasFeature(planId: string | null | undefined, feature: keyof Pick<PlanConfig, 'canShare' | 'canAnalyze' | 'canUseCustomKeys' | 'prioritySupport'>): boolean {
  return getPlan(planId)[feature];
}

/** Usage event types — match the `eventType` field in UsageEvent model */
export const USAGE_EVENT_TYPES = {
  QUERY_EXECUTED: 'query_executed',
  FILE_UPLOADED: 'file_uploaded',
  DASHBOARD_CREATED: 'dashboard_created',
  EXPORT_DOWNLOADED: 'export_downloaded',
} as const;

export type UsageEventType = (typeof USAGE_EVENT_TYPES)[keyof typeof USAGE_EVENT_TYPES];

/**
 * Check if a usage limit has been reached.
 * Returns { allowed: boolean, usage: number, limit: number | null, planName: string }
 */
export interface LimitCheckResult {
  allowed: boolean;
  usage: number;
  limit: number | null;
  planName: string;
  upgradePlanId: PlanId | null;
}

/**
 * Get the next plan that would increase the limit for a given feature
 */
function findUpgradePlan(currentPlanId: PlanId, feature: keyof PlanConfig): PlanId | null {
  const currentIdx = PLAN_ORDER.indexOf(currentPlanId);
  const currentLimit = PLANS[currentPlanId][feature];

  for (let i = currentIdx + 1; i < PLAN_ORDER.length; i++) {
    const nextPlan = PLANS[PLAN_ORDER[i]];
    const nextLimit = nextPlan[feature];
    // If the next plan has a higher limit or null (unlimited)
    if (nextLimit === null || (typeof currentLimit === 'number' && typeof nextLimit === 'number' && nextLimit > currentLimit)) {
      return PLAN_ORDER[i];
    }
  }
  return null;
}

export { findUpgradePlan };
