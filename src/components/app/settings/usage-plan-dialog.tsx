'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  Database,
  LayoutDashboard,
  HardDrive,
  MessageSquare,
  ArrowUpRight,
  Check,
  Crown,
  Loader2,
  AlertTriangle,
  Sparkles,
  Share2,
  Headphones,
  Key,
  FileDown,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { type TranslationKey, type TranslationFn } from '@/lib/i18n';
import { useAuth } from '@/components/auth/AuthProvider';
import { PLANS, PLAN_ORDER, getPlan, type PlanId } from '@/lib/plans';
import { toast } from 'sonner';
import { authFetch } from '@/lib/fetch-utils';

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

interface UsageData {
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
    storage: StorageMetric;
  };
  periodStart: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-red-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function getProgressTrackColor(percentage: number): string {
  if (percentage >= 80) return 'bg-red-500/20';
  if (percentage >= 60) return 'bg-yellow-500/20';
  return 'bg-emerald-500/20';
}

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  supporter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  starter: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pro: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  business: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const PLAN_ACCENT_COLORS: Record<PlanId, string> = {
  free: 'border-gray-500/30',
  supporter: 'border-amber-500/30',
  starter: 'border-blue-500/30',
  pro: 'border-emerald-500/30',
  business: 'border-purple-500/30',
};

// ── Component ────────────────────────────────────────────────────────────────

interface UsagePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsagePlanDialog({ open, onOpenChange }: UsagePlanDialogProps) {
  const { t, locale } = useI18n();
  const { dbUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlanId = (dbUser?.subscription?.plan || 'free') as PlanId;
  const currentPlan = getPlan(currentPlanId);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/usage');
      if (!res.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const data = await res.json();
      setUsageData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        fetchUsage();
      });
    }
  }, [open, fetchUsage]);

  const [upgradingPlanId, setUpgradingPlanId] = useState<PlanId | null>(null);

  const handleUpgrade = async (planId: PlanId) => {
    setUpgradingPlanId(planId);
    try {
      const res = await authFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingPeriod: 'monthly' }),
      });

      if (!res.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe checkout (or mock checkout)
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const planName = locale === 'es' ? currentPlan.nameEs : currentPlan.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-background/80 backdrop-blur-xl border-border/30 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              {t('usageAndPlans')}
            </DialogTitle>
            <DialogDescription>
              {t('currentPlan')}: {planName}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator className="opacity-30" />

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="ml-2 text-sm text-muted-foreground">{t('loading')}</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-sm text-red-500">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchUsage}>
                  {t('retry')}
                </Button>
              </div>
            ) : usageData ? (
              <>
                {/* ── Current Plan Card ──────────────────────────── */}
                <Card className={`border-2 ${PLAN_ACCENT_COLORS[currentPlanId]} bg-card/50 backdrop-blur-sm`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Crown className="h-4 w-4 text-emerald-600" />
                        {t('currentPlan')}
                      </CardTitle>
                      <Badge className={`${PLAN_BADGE_COLORS[currentPlanId]} text-xs`}>
                        {planName}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {currentPlan.maxQueries !== null && (
                        <div className="flex justify-between">
                          <span>{t('queriesUsed')}</span>
                          <span className="font-medium text-foreground">{currentPlan.maxQueries} {t('queriesThisMonth')}</span>
                        </div>
                      )}
                      {currentPlan.maxDataSources !== null && (
                        <div className="flex justify-between">
                          <span>{t('dataSourcesUsed')}</span>
                          <span className="font-medium text-foreground">{currentPlan.maxDataSources}</span>
                        </div>
                      )}
                      {currentPlan.maxStorageMB !== null && (
                        <div className="flex justify-between">
                          <span>{t('storageUsed')}</span>
                          <span className="font-medium text-foreground">{currentPlan.maxStorageMB} {t('mb')}</span>
                        </div>
                      )}
                      {currentPlan.maxDashboards !== null && (
                        <div className="flex justify-between">
                          <span>{t('dashboardsUsed')}</span>
                          <span className="font-medium text-foreground">{currentPlan.maxDashboards}</span>
                        </div>
                      )}
                    </div>
                    {currentPlanId !== 'business' && (
                      <Button
                        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        size="sm"
                        onClick={() => handleUpgrade(PLAN_ORDER[PLAN_ORDER.indexOf(currentPlanId) + 1] as PlanId)}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {t('upgradePlan')}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* ── Usage Stats ────────────────────────────────── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">{t('usageAndPlans')}</h3>

                  <div className="grid gap-4">
                    {/* Queries */}
                    <UsageBar
                      icon={<MessageSquare className="h-4 w-4" />}
                      label={t('queriesUsed')}
                      used={usageData.usage.queries.used}
                      limit={usageData.usage.queries.limit}
                      unlimited={usageData.usage.queries.unlimited}
                      percentage={usageData.usage.queries.percentage}
                      suffix={` ${t('queriesThisMonth')}`}
                      t={t}
                    />

                    {/* Data Sources */}
                    <UsageBar
                      icon={<Database className="h-4 w-4" />}
                      label={t('dataSourcesUsed')}
                      used={usageData.usage.dataSources.used}
                      limit={usageData.usage.dataSources.limit}
                      unlimited={usageData.usage.dataSources.unlimited}
                      percentage={usageData.usage.dataSources.percentage}
                      t={t}
                    />

                    {/* Storage */}
                    <UsageBar
                      icon={<HardDrive className="h-4 w-4" />}
                      label={t('storageUsed')}
                      used={usageData.usage.storage.usedMB}
                      limit={usageData.usage.storage.limitMB}
                      unlimited={usageData.usage.storage.unlimited}
                      percentage={usageData.usage.storage.percentage}
                      isStorage
                      t={t}
                    />

                    {/* Dashboards */}
                    <UsageBar
                      icon={<LayoutDashboard className="h-4 w-4" />}
                      label={t('dashboardsUsed')}
                      used={usageData.usage.dashboards.used}
                      limit={usageData.usage.dashboards.limit}
                      unlimited={usageData.usage.dashboards.unlimited}
                      percentage={usageData.usage.dashboards.percentage}
                      t={t}
                    />
                  </div>

                  {/* Limit reached warning */}
                  {(usageData.usage.queries.upgradePlanId ||
                    usageData.usage.dataSources.upgradePlanId ||
                    usageData.usage.dashboards.upgradePlanId ||
                    usageData.usage.storage.upgradePlanId) && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-amber-600">{t('usageLimitReached')}</p>
                        <p className="text-amber-600/80 mt-0.5">{t('usageLimitDesc')}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* ── Plan Comparison ────────────────────────────── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">{t('planComparison')}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PLAN_ORDER.map((pid) => {
                      const plan = PLANS[pid];
                      const isCurrent = pid === currentPlanId;
                      const isHigher = PLAN_ORDER.indexOf(pid) > PLAN_ORDER.indexOf(currentPlanId);

                      return (
                        <Card
                          key={pid}
                          className={`relative transition-all bg-card/50 backdrop-blur-sm ${
                            isCurrent
                              ? `border-2 ${PLAN_ACCENT_COLORS[pid]} shadow-md`
                              : 'border border-border/50 hover:border-emerald-500/30'
                          }`}
                        >
                          {isCurrent && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                              <Badge className={`${PLAN_BADGE_COLORS[pid]} text-[10px] px-2`}>
                                {t('currentPlan')}
                              </Badge>
                            </div>
                          )}

                          <CardContent className="p-4 pt-5 space-y-3">
                            {/* Plan name & price */}
                            <div>
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">
                                  {locale === 'es' ? plan.nameEs : plan.name}
                                </h4>
                                {!plan.canShare && !plan.canUseCustomKeys && pid === 'free' && (
                                  <span className="text-[10px] text-muted-foreground">Free forever</span>
                                )}
                              </div>
                              <div className="mt-1">
                                <span className="text-lg font-bold">{plan.priceDisplay}</span>
                                <span className="text-xs text-muted-foreground">/{t('perMonth')}</span>
                              </div>
                            </div>

                            {/* Key limits */}
                            <div className="space-y-1.5 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span>{plan.maxQueries ?? t('unlimited')} {t('queriesThisMonth')}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Database className="h-3 w-3 shrink-0" />
                                <span>{plan.maxDataSources ?? t('unlimited')} {t('dataSourcesUsed').toLowerCase()}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <HardDrive className="h-3 w-3 shrink-0" />
                                <span>{plan.maxStorageMB ? `${plan.maxStorageMB} ${t('mb')}` : t('unlimited')}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <LayoutDashboard className="h-3 w-3 shrink-0" />
                                <span>{plan.maxDashboards ?? t('unlimited')} {t('dashboards')}</span>
                              </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-1 text-xs">
                              {plan.canAnalyze && (
                                <FeatureLine icon={<Sparkles className="h-3 w-3 text-emerald-500" />} label={t('aiAnalysis')} />
                              )}
                              {plan.canUseCustomKeys && (
                                <FeatureLine icon={<Key className="h-3 w-3 text-emerald-500" />} label={t('customAIKeys')} />
                              )}
                              {plan.canShare && (
                                <FeatureLine icon={<Share2 className="h-3 w-3 text-emerald-500" />} label={t('shareDashboards')} />
                              )}
                              {plan.prioritySupport && (
                                <FeatureLine icon={<Headphones className="h-3 w-3 text-emerald-500" />} label={t('prioritySupport')} />
                              )}
                              {plan.maxExportRows !== null && (
                                <FeatureLine icon={<FileDown className="h-3 w-3 text-emerald-500" />} label={`${t('exportRows')} ${plan.maxExportRows.toLocaleString()}`} />
                              )}
                              {plan.maxExportRows === null && (
                                <FeatureLine icon={<FileDown className="h-3 w-3 text-emerald-500" />} label={`${t('exportRows')} ${t('unlimited')}`} />
                              )}
                            </div>

                            {/* Action button */}
                            {isCurrent ? (
                              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
                                <Check className="h-3.5 w-3.5" />
                                {t('currentPlan')}
                              </div>
                            ) : isHigher ? (
                              <Button
                                size="sm"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                                onClick={() => handleUpgrade(pid)}
                                disabled={upgradingPlanId !== null}
                              >
                                {upgradingPlanId === pid ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3" />
                                )}
                                {upgradingPlanId === pid ? '...' : t('upgradePlan')}
                              </Button>
                            ) : (
                              <div className="text-center text-[10px] text-muted-foreground pt-1">
                                Lower plan
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface UsageBarProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
  percentage: number;
  suffix?: string;
  isStorage?: boolean;
  t: TranslationFn;
}

function UsageBar({ icon, label, used, limit, unlimited, percentage, suffix, isStorage, t }: UsageBarProps) {
  const displayUsed = isStorage ? `${used} ${t('mb')}` : used;
  const displayLimit = unlimited ? t('unlimited') : isStorage ? `${limit} ${t('mb')}` : limit;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-medium text-foreground tabular-nums">
          {displayUsed} {t('of')} {displayLimit}
          {suffix && <span className="text-muted-foreground font-normal">{suffix}</span>}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--muted)' }}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor(percentage)}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}

function FeatureLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
