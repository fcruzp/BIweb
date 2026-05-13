'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useAuth } from '@/components/auth/AuthProvider';
import { authFetch } from '@/lib/fetch-utils';
import type { PlanId } from '@/lib/plans';

// ── Types matching API response ──────────────────────────────────────────────

interface UsageMetric {
  used: number;
  limit: number | null;
  unlimited: boolean;
  percentage: number;
  upgradePlanId: PlanId | null;
}

interface StorageMetric {
  usedMB: number;
  limitMB: number | null;
  unlimited: boolean;
  percentage: number;
  upgradePlanId: PlanId | null;
}

interface PlanFeatures {
  canShare: boolean;
  canAnalyze: boolean;
  canUseCustomKeys: boolean;
  prioritySupport: boolean;
  maxExportRows: number | null;
}

export interface UsageData {
  plan: {
    id: PlanId;
    name: string;
    nameEs: string;
    price: number;
    priceDisplay: string;
    features: PlanFeatures;
  };
  subscription: {
    plan: PlanId;
    status: string;
  };
  usage: {
    queries: UsageMetric;
    dataSources: UsageMetric;
    dashboards: UsageMetric;
    chatSessions: UsageMetric;
    storage: StorageMetric;
  };
  periodStart: string;
}

export type LimitType = 'queries' | 'dataSources' | 'dashboards' | 'chatSessions' | 'storage';

export interface LimitCheck {
  atLimit: boolean;
  nearLimit: boolean; // >= 80%
  used: number;
  limit: number | null;
  unlimited: boolean;
  percentage: number;
  upgradePlanId: PlanId | null;
}

const EMPTY_LIMIT: LimitCheck = {
  atLimit: false,
  nearLimit: false,
  used: 0,
  limit: null,
  unlimited: true,
  percentage: 0,
  upgradePlanId: null,
};

// ── Zustand Store (shared state across all components) ───────────────────────

interface UsageLimitsState {
  usageData: UsageData | null;
  loading: boolean;
  refresh: () => Promise<void>;
  reset: () => void;
}

export const useUsageLimitsStore = create<UsageLimitsState>((set, get) => ({
  usageData: null,
  loading: false,

  refresh: async () => {
    // Prevent concurrent fetches
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await authFetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        set({ usageData: data });
      } else {
        console.warn('[useUsageLimits] Failed to fetch usage:', res.status, res.statusText);
      }
    } catch (err) {
      console.warn('[useUsageLimits] Error fetching usage:', err instanceof Error ? err.message : err);
    } finally {
      set({ loading: false });
    }
  },

  reset: () => {
    set({ usageData: null, loading: false });
  },
}));

// ── Computed helpers ─────────────────────────────────────────────────────────

function getLimitFromData(usageData: UsageData | null, type: LimitType): LimitCheck {
  if (!usageData) return EMPTY_LIMIT;

  const metric = type === 'storage'
    ? usageData.usage.storage
    : usageData.usage[type];

  if (!metric) return EMPTY_LIMIT;

  const isStorage = type === 'storage';
  const used = isStorage ? (metric as StorageMetric).usedMB : (metric as UsageMetric).used;
  const limit = isStorage ? (metric as StorageMetric).limitMB : (metric as UsageMetric).limit;
  const unlimited = metric.unlimited;
  const percentage = metric.percentage;
  const atLimit = !unlimited && limit !== null && used >= limit;
  const nearLimit = !unlimited && percentage >= 80;

  return {
    atLimit,
    nearLimit,
    used,
    limit,
    unlimited,
    percentage,
    upgradePlanId: metric.upgradePlanId,
  };
}

/**
 * Hook to access shared usage/plan data.
 * All components share the same Zustand store — any refresh updates ALL consumers.
 *
 * Usage:
 *   const { usageData, limits, loading, refresh } = useUsageLimits();
 *   if (limits.dataSources.atLimit) { ... show upgrade prompt ... }
 */
export function useUsageLimits() {
  const usageData = useUsageLimitsStore((s) => s.usageData);
  const loading = useUsageLimitsStore((s) => s.loading);
  const refresh = useUsageLimitsStore((s) => s.refresh);

  const getLimit = (type: LimitType): LimitCheck => getLimitFromData(usageData, type);

  const limits = {
    dataSources: getLimit('dataSources'),
    dashboards: getLimit('dashboards'),
    chatSessions: getLimit('chatSessions'),
    queries: getLimit('queries'),
    storage: getLimit('storage'),
  };

  return {
    usageData,
    loading,
    limits,
    getLimit,
    refresh,
  };
}

/**
 * Initializer hook — call ONCE in a top-level component (e.g. AppSidebar).
 * Triggers the initial fetch + re-fetches when auth/subscription changes.
 * This ensures the shared Zustand store is populated for all consumers.
 */
export function useUsageLimitsInit() {
  const { isAuthenticated, dbUser } = useAuth();
  const refresh = useUsageLimitsStore((s) => s.refresh);
  const reset = useUsageLimitsStore((s) => s.reset);
  const initialFetchDone = useRef(false);

  // Fetch on mount + when subscription changes
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
      initialFetchDone.current = true;
    } else if (initialFetchDone.current) {
      // User signed out — clear stale data
      reset();
    }
  }, [isAuthenticated, dbUser?.subscription?.plan, dbUser?.subscription?.status, refresh, reset]);
}
