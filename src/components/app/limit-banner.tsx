'use client';

import { Lock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/use-i18n';
import type { LimitCheck } from '@/hooks/use-usage-limits';
import type { PlanId } from '@/lib/plans';

interface LimitBannerProps {
  /** The limit check result */
  limit: LimitCheck;
  /** Resource name for display (e.g., 'data sources', 'dashboards') */
  resourceLabel: string;
  /** Callback when user clicks "View Plans" / upgrade */
  onViewPlans?: () => void;
  /** Whether to show the near-limit warning (default: true) */
  showNearLimit?: boolean;
  /** Compact mode for inline use (no upgrade button, smaller text) */
  compact?: boolean;
}

/**
 * Reusable banner that shows:
 * - At limit: Red/amber banner with lock icon + upgrade prompt
 * - Near limit (≥80%): Amber warning with remaining count
 * - Under limit: Nothing
 */
export function LimitBanner({
  limit,
  resourceLabel,
  onViewPlans,
  showNearLimit = true,
  compact = false,
}: LimitBannerProps) {
  const { t } = useI18n();

  // Don't render if unlimited or under 80%
  if (limit.unlimited || (!limit.atLimit && !limit.nearLimit)) {
    return null;
  }

  // Don't show near-limit warning if explicitly disabled
  if (limit.nearLimit && !limit.atLimit && !showNearLimit) {
    return null;
  }

  // At limit — show blocking warning
  if (limit.atLimit) {
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 bg-red-500/5 rounded px-2 py-1">
          <Lock className="h-3 w-3 shrink-0" />
          <span className="truncate">{resourceLabel}: {limit.used}/{limit.limit}</span>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
        <Lock className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            {t('limitReached')}
          </p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
            {limit.used}/{limit.limit} {resourceLabel.toLowerCase()} — {t('upgradeRequired').toLowerCase()}
          </p>
          {onViewPlans && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs gap-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
              onClick={onViewPlans}
            >
              <ArrowUpRight className="h-3 w-3" />
              {t('viewPlans')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Near limit (≥80%) — show warning
  if (limit.nearLimit) {
    const remaining = (limit.limit ?? 0) - limit.used;

    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/5 rounded px-2 py-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="truncate">{limit.used}/{limit.limit} {resourceLabel.toLowerCase()}</span>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {t('nearLimitWarning', { resource: resourceLabel.toLowerCase(), used: String(limit.used), limit: String(limit.limit) })}
          </p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            {t('queriesRemaining', { remaining: String(remaining) })}
          </p>
          {onViewPlans && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={onViewPlans}
            >
              <ArrowUpRight className="h-3 w-3" />
              {t('viewPlans')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
