'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  BarChart3,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  User,
  Mail,
  Crown,
  Globe,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAIStatus } from '@/hooks/use-ai-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/app/locale-switcher';
import { UsagePlanDialog } from '@/components/app/settings/usage-plan-dialog';
import { getPlan, type PlanId } from '@/lib/plans';

const PLAN_BADGE_COLORS: Record<PlanId, string> = {
  free: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  supporter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  starter: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pro: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  business: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t, locale } = useI18n();
  const { user, dbUser } = useAuth();
  const { status: aiStatus, errorMessage: aiError, check: checkAI } = useAIStatus();
  const [usagePlanOpen, setUsagePlanOpen] = useState(false);

  const planId = (dbUser?.subscription?.plan || 'free') as PlanId;
  const plan = getPlan(planId);
  const planName = locale === 'es' ? plan.nameEs : plan.name;

  const displayName = user?.user_metadata?.full_name || '';
  const email = user?.email || '';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-background/80 backdrop-blur-xl border-border/30 shadow-2xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600" />
                {t('settings')}
              </DialogTitle>
              <DialogDescription>
                {displayName || email}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Separator className="opacity-30" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* ── Account ─────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3 w-3" />
                {t('account')}
              </h3>

              <div className="space-y-2 text-sm">
                {displayName && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate">{displayName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className={`${PLAN_BADGE_COLORS[planId]} text-[10px] px-1.5 h-4`}>
                    {planName}
                  </Badge>
                  {planId !== 'business' && (
                    <button
                      onClick={() => setUsagePlanOpen(true)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 ml-1"
                    >
                      {t('upgradePlan')} →
                    </button>
                  )}
                </div>
              </div>
            </section>

            <Separator className="opacity-20" />

            {/* ── AI Connection ───────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wifi className="h-3 w-3" />
                {t('aiConnection')}
              </h3>

              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {aiStatus === 'ok' && (
                    <>
                      <span className="flex h-2.5 w-2.5">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('aiOk')}</span>
                    </>
                  )}
                  {aiStatus === 'error' && (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <div>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">{t('aiConnectionError')}</span>
                        {aiError && (
                          <p className="text-[10px] text-red-500/70 mt-0.5 max-w-[200px] truncate">{aiError}</p>
                        )}
                      </div>
                    </>
                  )}
                  {aiStatus === 'checking' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      <span className="text-sm text-amber-600 dark:text-amber-400">{t('aiChecking')}</span>
                    </>
                  )}
                  {aiStatus === 'unknown' && (
                    <>
                      <span className="flex h-2.5 w-2.5">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400" />
                      </span>
                      <span className="text-sm text-muted-foreground">—</span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => checkAI()}
                  disabled={aiStatus === 'checking'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${aiStatus === 'checking' ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </section>

            <Separator className="opacity-20" />

            {/* ── Language ────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                {t('language')}
              </h3>
              <LocaleSwitcher />
            </section>

            <Separator className="opacity-20" />

            {/* ── Usage & Plans ───────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3" />
                {t('usageAndPlans')}
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-sm border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 hover:text-emerald-700"
                onClick={() => setUsagePlanOpen(true)}
              >
                <BarChart3 className="h-4 w-4" />
                {t('viewPlans')}
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage & Plans full dialog */}
      <UsagePlanDialog open={usagePlanOpen} onOpenChange={setUsagePlanOpen} />
    </>
  );
}
