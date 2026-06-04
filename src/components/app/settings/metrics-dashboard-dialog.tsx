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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  MessageSquare,
  Database,
  HardDrive,
  LayoutDashboard,
  Loader2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  FileText,
  Download,
  Crown,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useI18n } from '@/hooks/use-i18n';
import { type TranslationKey } from '@/lib/i18n';
import { useAuth } from '@/components/auth/AuthProvider';
import { authFetch } from '@/lib/fetch-utils';
import { getPlan, type PlanId } from '@/lib/plans';
import { UsagePlanDialog } from '@/components/app/settings/usage-plan-dialog';

// ── Types ────────────────────────────────────────────────────────────────────

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
    chatSessions: UsageMetric;
    storage: StorageMetric;
  };
  periodStart: string;
}

interface DailyDataPoint {
  date: string;
  shortDate: string;
  count: number;
  avgDuration: number;
}

interface EventBreakdownItem {
  eventType: string;
  count: number;
}

interface MetricsData {
  dailyQueries: DailyDataPoint[];
  eventBreakdown: EventBreakdownItem[];
  avgResponseTime: number;
  totalQueriesThisMonth: number;
  estimatedTotal: number | null;
  daysRemaining: number;
  projectionDate: string | null;
}

// ── Mock invoice generator ───────────────────────────────────────────────────

interface MockInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'current' | 'paid' | 'pending';
}

function generateMockInvoices(planName: string, price: number): MockInvoice[] {
  const invoices: MockInvoice[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    invoices.push({
      id: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
      date: date.toISOString(),
      description: `${planName} Plan - ${date.toLocaleDateString('en', { month: 'long', year: 'numeric' })}`,
      amount: price,
      status: i === 0 ? 'current' : 'paid',
    });
  }
  return invoices;
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  query_executed: 'query_executed',
  file_uploaded: 'file_uploaded',
  dashboard_created: 'dashboard_created',
  export_downloaded: 'export_downloaded',
};

// ── Component ────────────────────────────────────────────────────────────────

interface MetricsDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetricsDashboardDialog({ open, onOpenChange }: MetricsDashboardDialogProps) {
  const { t, locale } = useI18n();
  const { dbUser } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usagePlanOpen, setUsagePlanOpen] = useState(false);

  const currentPlanId = (dbUser?.subscription?.plan || 'free') as PlanId;
  const currentPlan = getPlan(currentPlanId);
  const planName = locale === 'es' ? currentPlan.nameEs : currentPlan.name;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch usage data and metrics in parallel
      const [usageRes, metricsRes] = await Promise.all([
        authFetch('/api/usage'),
        authFetch('/api/usage/metrics'),
      ]);

      if (!usageRes.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const usage = await usageRes.json();
      setUsageData(usage);

      if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        setMetricsData(metrics);
      } else {
        // If metrics endpoint doesn't exist yet, generate mock data
        setMetricsData(generateMockMetrics(usage, locale));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        fetchData();
      });
    }
  }, [open, fetchData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-background/80 backdrop-blur-xl border-border/30 shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              {t('metricsDashboard')}
            </DialogTitle>
            <DialogDescription>
              {planName} — {t('usageAndPlans')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Separator className="opacity-30" />

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 pt-2 shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">{t('metricsOverview')}</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs sm:text-sm">{t('metricsActivity')}</TabsTrigger>
              <TabsTrigger value="billing" className="text-xs sm:text-sm">{t('metricsBilling')}</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              {loading ? (
                <LoadingState t={t} />
              ) : error ? (
                <ErrorState error={error} onRetry={fetchData} t={t} />
              ) : usageData && metricsData ? (
                <>
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <OverviewTab
                      usageData={usageData}
                      metricsData={metricsData}
                      t={t}
                      locale={locale}
                      planName={planName}
                    />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0 space-y-6">
                    <ActivityTab
                      metricsData={metricsData}
                      t={t}
                      locale={locale}
                    />
                  </TabsContent>

                  <TabsContent value="billing" className="mt-0 space-y-6">
                    <BillingTab
                      usageData={usageData}
                      t={t}
                      locale={locale}
                      planName={planName}
                      currentPlan={currentPlan}
                      onViewPlans={() => setUsagePlanOpen(true)}
                    />
                  </TabsContent>
                </>
              ) : null}
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>

      <UsagePlanDialog open={usagePlanOpen} onOpenChange={setUsagePlanOpen} />
    </Dialog>
  );
}

// ── Loading & Error States ───────────────────────────────────────────────────

function LoadingState({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      <span className="ml-2 text-sm text-muted-foreground">{t('loading')}</span>
    </div>
  );
}

function ErrorState({ error, onRetry, t }: { error: string; onRetry: () => void; t: (key: TranslationKey) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
      <p className="text-sm text-red-500">{error}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  usageData,
  metricsData,
  t,
  locale,
  planName,
}: {
  usageData: UsageData;
  metricsData: MetricsData;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
  locale: string;
  planName: string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Queries This Month */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">{t('queriesThisMonth')}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">{metricsData.totalQueriesThisMonth}</span>
              {metricsData.totalQueriesThisMonth > 0 && (
                <TrendingUp className="h-4 w-4 text-emerald-500 mb-1" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">{t('avgResponseTime')}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">{metricsData.avgResponseTime}</span>
              <span className="text-sm text-muted-foreground mb-0.5">{t('ms')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Days Remaining */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">{t('daysRemaining')}</span>
            </div>
            <span className="text-2xl font-bold text-foreground">{metricsData.daysRemaining}</span>
          </CardContent>
        </Card>

        {/* Estimated Total */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">{t('estimatedTotal')}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">
                {metricsData.estimatedTotal ?? t('unlimited')}
              </span>
              {metricsData.estimatedTotal !== null && (
                <span className="text-sm text-muted-foreground mb-0.5">{t('queriesPerDay')}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress Bars */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t('usageAndPlans')}</h3>
        <div className="grid gap-4">
          {/* Queries */}
          <UsageProgressBar
            icon={<MessageSquare className="h-4 w-4" />}
            label={t('queriesUsed')}
            used={usageData.usage.queries.used}
            limit={usageData.usage.queries.limit}
            unlimited={usageData.usage.queries.unlimited}
            percentage={usageData.usage.queries.percentage}
            suffix={` ${t('queriesThisMonth')}`}
            isStorage={false}
            t={t}
          />
          {/* Data Sources */}
          <UsageProgressBar
            icon={<Database className="h-4 w-4" />}
            label={t('dataSourcesUsed')}
            used={usageData.usage.dataSources.used}
            limit={usageData.usage.dataSources.limit}
            unlimited={usageData.usage.dataSources.unlimited}
            percentage={usageData.usage.dataSources.percentage}
            t={t}
          />
          {/* Storage */}
          <UsageProgressBar
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
          <UsageProgressBar
            icon={<LayoutDashboard className="h-4 w-4" />}
            label={t('dashboardsUsed')}
            used={usageData.usage.dashboards.used}
            limit={usageData.usage.dashboards.limit}
            unlimited={usageData.usage.dashboards.unlimited}
            percentage={usageData.usage.dashboards.percentage}
            t={t}
          />
        </div>
      </div>

      {/* Projection Warning Banner */}
      {metricsData.projectionDate && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-amber-600">
              {t('projectionWarning')} {metricsData.projectionDate}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({
  metricsData,
  t,
  locale,
}: {
  metricsData: MetricsData;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
  locale: string;
}) {
  const hasChartData = metricsData.dailyQueries.length > 0;

  return (
    <div className="space-y-6">
      {/* Daily Queries Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            {t('dailyQueries')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={metricsData.dailyQueries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'count') return [value, t('queries')];
                    return [`${value}${t('ms')}`, t('avgResponseTime')];
                  }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#emeraldGradient)"
                  isAnimationActive={false}
                  animationDuration={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData t={t} />
          )}
        </CardContent>
      </Card>

      {/* Event Breakdown */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            {t('eventBreakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricsData.eventBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={metricsData.eventBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="eventType"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="count"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                  animationDuration={0}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoChartData t={t} />
          )}
        </CardContent>
      </Card>

      {/* Avg Response Time Indicator */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium">{t('avgResponseTime')}</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-foreground">{metricsData.avgResponseTime}</span>
            <span className="text-sm text-muted-foreground mb-0.5">{t('ms')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Billing Tab ──────────────────────────────────────────────────────────────

function BillingTab({
  usageData,
  t,
  locale,
  planName,
  currentPlan,
  onViewPlans,
}: {
  usageData: UsageData;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
  locale: string;
  planName: string;
  currentPlan: ReturnType<typeof getPlan>;
  onViewPlans: () => void;
}) {
  const invoices = generateMockInvoices(planName, currentPlan.price);

  const statusBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">{t('paid')}</Badge>;
    if (status === 'current') return <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">{t('current')}</Badge>;
    return <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">{t('pending')}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="border-2 border-emerald-500/30 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{planName}</h4>
                <p className="text-xs text-muted-foreground">
                  {currentPlan.priceDisplay}/{t('perMonth')}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {usageData.subscription.status === 'active' ? t('current') : t('pending')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Billing History Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{t('billingHistory')}</h3>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1.5fr_auto_auto_auto] gap-2 px-4 py-2 bg-muted/50 text-xs text-muted-foreground font-medium">
            <span>{t('invoice')}</span>
            <span className="hidden sm:block">{t('description')}</span>
            <span>{t('amount')}</span>
            <span>{t('status')}</span>
            <span className="w-8"></span>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-[1fr_1.5fr_auto_auto_auto] gap-2 px-4 py-2.5 text-xs hover:bg-muted/20 transition-colors"
              >
                <span className="font-medium text-foreground">{inv.id}</span>
                <span className="hidden sm:block text-muted-foreground truncate">{inv.description}</span>
                <span className="font-medium text-foreground">${inv.amount.toFixed(2)}</span>
                <span>{statusBadge(inv.status)}</span>
                <span className="w-8">
                  {inv.status === 'paid' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-emerald-600"
                      onClick={() => window.open(`/api/usage/invoice?month=${inv.id.replace('INV-', '')}`, '_blank')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View Plans Button */}
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
        onClick={onViewPlans}
      >
        <ArrowUpRight className="h-4 w-4" />
        {t('viewPlans')}
      </Button>
    </div>
  );
}

// ── Shared Sub-components ────────────────────────────────────────────────────

interface UsageProgressBarProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
  percentage: number;
  suffix?: string;
  isStorage?: boolean;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

function UsageProgressBar({ icon, label, used, limit, unlimited, percentage, suffix, isStorage, t }: UsageProgressBarProps) {
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

function NoChartData({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{t('noChartData')}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{t('noChartDataDesc')}</p>
    </div>
  );
}

// ── Mock Metrics Generator ───────────────────────────────────────────────────
// Used when /api/usage/metrics doesn't exist yet

function generateMockMetrics(usageData: UsageData, locale: string = 'en'): MetricsData {
  const now = new Date();
  const periodStart = new Date(usageData.periodStart);
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);
  const totalQueries = usageData.usage.queries.used;

  // Generate daily query data for the last 30 days
  const dailyQueries: DailyDataPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const count = i < daysElapsed ? Math.max(0, Math.round((totalQueries / daysElapsed) * (0.5 + Math.random()))) : 0;
    dailyQueries.push({
      date: date.toISOString().split('T')[0],
      shortDate: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      count,
      avgDuration: Math.round(200 + Math.random() * 800),
    });
  }

  // Generate event breakdown
  const eventBreakdown: EventBreakdownItem[] = [
    { eventType: 'query_executed', count: totalQueries },
    { eventType: 'file_uploaded', count: usageData.usage.dataSources.used },
    { eventType: 'dashboard_created', count: usageData.usage.dashboards.used },
    { eventType: 'export_downloaded', count: Math.round(totalQueries * 0.15) },
  ].filter(item => item.count > 0);

  // Calculate estimated total queries
  const queriesPerDay = totalQueries / daysElapsed;
  const estimatedTotal = Math.round(queriesPerDay * daysInMonth);

  // Calculate projection date (when limit will be reached)
  let projectionDate: string | null = null;
  if (usageData.usage.queries.limit && queriesPerDay > 0) {
    const remaining = usageData.usage.queries.limit - totalQueries;
    if (remaining > 0 && remaining / queriesPerDay < daysRemaining) {
      const projectionDay = new Date(now);
      projectionDay.setDate(projectionDay.getDate() + Math.ceil(remaining / queriesPerDay));
      projectionDate = projectionDay.toLocaleDateString(locale === 'es' ? 'es' : 'en', {
        month: 'long',
        day: 'numeric',
      });
    }
  }

  // Calculate avg response time from daily data
  const validDays = dailyQueries.filter(d => d.avgDuration > 0);
  const avgResponseTime = validDays.length > 0
    ? Math.round(validDays.reduce((sum, d) => sum + d.avgDuration, 0) / validDays.length)
    : 0;

  return {
    dailyQueries,
    eventBreakdown,
    avgResponseTime,
    totalQueriesThisMonth: totalQueries,
    estimatedTotal: usageData.usage.queries.unlimited ? null : estimatedTotal,
    daysRemaining,
    projectionDate,
  };
}
