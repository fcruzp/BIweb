'use client';

import { useState } from 'react';
import { Crown, BarChart3, Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useUsageLimits } from '@/hooks/use-usage-limits';
import { useI18n } from '@/hooks/use-i18n';
import { PLANS, type PlanId } from '@/lib/plans';
import { UsagePlanDialog } from '@/components/app/settings/usage-plan-dialog';

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  supporter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  starter: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pro: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  business: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

function getProgressColor(pct: number): string {
  if (pct >= 100) return '[&>div]:bg-red-500';
  if (pct >= 80) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-emerald-500';
}

/**
 * Compact widget shown in the sidebar footer.
 * Displays: Plan badge + most critical usage bar + upgrade prompt.
 */
export function PlanUsageWidget() {
  const { limits, usageData } = useUsageLimits();
  const { t, locale } = useI18n();
  const [plansOpen, setPlansOpen] = useState(false);

  if (!usageData) return null;

  const planId = usageData.plan.id;
  const planName = locale === 'es' ? usageData.plan.nameEs : usageData.plan.name;

  // Find the most critical limit (highest percentage, excluding unlimited)
  const allLimits = [
    { key: 'queries' as const, limit: limits.queries, label: t('queriesUsed') },
    { key: 'dataSources' as const, limit: limits.dataSources, label: t('dataSourcesUsed') },
    { key: 'dashboards' as const, limit: limits.dashboards, label: t('dashboardsUsed') },
    { key: 'chatSessions' as const, limit: limits.chatSessions, label: t('chatSessions') },
    { key: 'storage' as const, limit: limits.storage, label: t('storageUsed') },
  ];

  // Sort by percentage descending, filter out unlimited
  const criticalLimits = allLimits
    .filter(l => !l.limit.unlimited)
    .sort((a, b) => b.limit.percentage - a.limit.percentage);

  const mostCritical = criticalLimits[0];
  const hasAnyAtLimit = allLimits.some(l => l.limit.atLimit);
  const hasAnyNearLimit = allLimits.some(l => l.limit.nearLimit && !l.limit.atLimit);

  return (
    <>
      <div className="px-2 py-2 space-y-2 group-data-[collapsible=icon]:hidden">
        {/* Plan badge row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Crown className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{t('currentPlan')}</span>
          </div>
          <Badge className={`${PLAN_BADGE_COLORS[planId]} text-[9px] px-1.5 h-4`}>
            {planName}
          </Badge>
        </div>

        {/* Most critical usage bar */}
        {mostCritical && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate">{mostCritical.label}</span>
              <span className="tabular-nums shrink-0 ml-1">
                {mostCritical.limit.used}/{mostCritical.limit.limit}
              </span>
            </div>
            <Progress
              value={Math.min(100, mostCritical.limit.percentage)}
              className={`h-1.5 ${getProgressColor(mostCritical.limit.percentage)}`}
            />
          </div>
        )}

        {/* At-limit alert */}
        {hasAnyAtLimit && (
          <button
            onClick={() => setPlansOpen(true)}
            className="flex items-center gap-1.5 w-full text-[10px] text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded px-2 py-1.5 transition-colors"
          >
            <Lock className="h-3 w-3 shrink-0" />
            <span className="truncate">{t('limitReached')}</span>
          </button>
        )}

        {/* Near-limit warning */}
        {hasAnyNearLimit && !hasAnyAtLimit && (
          <button
            onClick={() => setPlansOpen(true)}
            className="flex items-center gap-1.5 w-full text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded px-2 py-1.5 transition-colors"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="truncate">{t('upgradeRequired')}</span>
          </button>
        )}

        {/* View Plans link */}
        {planId !== 'business' && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/5"
            onClick={() => setPlansOpen(true)}
          >
            <BarChart3 className="h-3 w-3" />
            {t('viewPlans')}
          </Button>
        )}
      </div>

      <UsagePlanDialog open={plansOpen} onOpenChange={setPlansOpen} />
    </>
  );
}
