'use client';

import { useState, useEffect, useCallback } from 'react';
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

/**
 * Hook to fetch and cache usage/plan data.
 * Automatically refreshes when the user's subscription changes.
 *
 * Usage:
 *   const { usageData, limits, refresh } = useUsageLimits();
 *   if (limits.dataSources.atLimit) { ... show upgrade prompt ... }
 */
export function useUsageLimits() {
  const { dbUser, isAuthenticated } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      } else {
        console.warn('[useUsageLimits] Failed to fetch usage:', res.status, res.statusText);
      }
    } catch (err) {
      // Silently fail — limit checks will default to "allowed"
      console.warn('[useUsageLimits] Error fetching usage:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch on mount + when subscription changes
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, dbUser?.subscription?.plan, dbUser?.subscription?.status]);

  // Helper to check a specific limit type
  const getLimit = useCallback(
    (type: LimitType): LimitCheck => {
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
    },
    [usageData]
  );

  // Pre-computed limit checks for common resources
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
    refresh: fetchUsage,
  };
}
