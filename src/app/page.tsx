'use client';

import { AppLayout } from '@/components/app/app-layout';
import { ChatInterface } from '@/components/app/chat/chat-interface';
import { DashboardView } from '@/components/app/dashboard/dashboard-view';
import { QueryHistory } from '@/components/app/history/query-history';
import { SchemaExplorer } from '@/components/app/sidebar/schema-explorer';
import { OnboardingScreen } from '@/components/app/onboarding';
import { useAppStore } from '@/stores/app-store';
import { useAuth } from '@/components/auth/AuthProvider';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { getPendingUpgradePlan, clearPendingUpgradePlan } from '@/lib/pending-plan';
import { authFetch } from '@/lib/fetch-utils';
import { PLANS, type PlanId } from '@/lib/plans';

export default function Home() {
  const { currentView, setActiveDataSource } = useAppStore();
  const { isAuthenticated, isLoading, showOnboarding, completeOnboarding, dbUser } = useAuth();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const { t } = useI18n();
  const checkoutAttemptedRef = useRef(false);

  // Handle billing redirect notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (billing === 'success') {
      toast.success(t('billingSuccess'));
      window.history.replaceState({}, '', '/');
    } else if (billing === 'cancelled') {
      toast.info(t('billingCancelled'));
      window.history.replaceState({}, '', '/');
    }
  }, [t]);

  // Auto-trigger checkout for pending upgrade plan
  // When a user signs up from a pricing CTA, they have a plan saved in sessionStorage.
  // After onboarding completes (or is skipped), we auto-trigger the Stripe checkout.
  //
  // CRITICAL: We check BOTH showOnboarding AND dbUser to prevent a race condition:
  //   - onAuthStateChange sets isAuthenticated=true BEFORE syncDbUser finishes
  //   - Without the dbUser check, this effect would fire and redirect to checkout
  //     BEFORE the onboarding screen is even shown
  useEffect(() => {
    if (checkoutAttemptedRef.current) return;
    if (!isAuthenticated || isLoading || showOnboarding || !dbUser) return;

    const pendingPlan = getPendingUpgradePlan() as PlanId | null;
    if (!pendingPlan || !PLANS[pendingPlan]) return;

    // Mark as attempted immediately to prevent double-trigger
    checkoutAttemptedRef.current = true;

    console.log(`[Home] Auto-checkout triggered for plan: ${pendingPlan}`);

    // Use an IIFE inside useEffect (not setTimeout) to avoid cleanup race conditions.
    // The checkout redirect (window.location.href) will unmount the entire app anyway.
    (async () => {
      try {
        const res = await authFetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: pendingPlan, billingPeriod: 'monthly' }),
        });

        if (!res.ok) {
          throw new Error(`Checkout returned ${res.status}`);
        }

        const data = await res.json();

        if (data.url) {
          // Clear the pending plan before navigating away
          clearPendingUpgradePlan();
          // Navigate to Stripe checkout (or mock checkout)
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (err) {
        console.warn('[Home] Auto-checkout failed:', err);
        clearPendingUpgradePlan();
        toast.info(t('billingUpgradePending'));
      }
    })();
  }, [isAuthenticated, isLoading, showOnboarding, dbUser]);

  const handleOnboardingComplete = useCallback(async (loadDemoData: boolean) => {
    if (loadDemoData) {
      setIsCreatingDemo(true);
      try {
        const res = await fetch('/api/onboarding/demo', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.dataSourceId) {
            setActiveDataSource(data.dataSourceId);
          }
        }
      } catch (err) {
        console.warn('Failed to create demo data:', err);
      } finally {
        setIsCreatingDemo(false);
      }
    }
    await completeOnboarding();
  }, [completeOnboarding, setActiveDataSource]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">Loading DataMind...</p>
        </div>
      </div>
    );
  }

  // Show welcome/auth screen if not authenticated
  if (!isAuthenticated) {
    return <WelcomeScreen />;
  }

  // CRITICAL: Wait for DB sync to complete before rendering anything else.
  // This prevents a race condition where:
  //   1. onAuthStateChange sets isAuthenticated=true
  //   2. But syncDbUser() hasn't finished yet → dbUser is null, showOnboarding is false
  //   3. The main app renders briefly (or auto-checkout fires prematurely)
  if (!dbUser) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">Sincronizando tu cuenta...</p>
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    if (isCreatingDemo) {
      return (
        <div className="flex h-svh items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
            <p className="text-sm text-white/60">Preparando tus datos de demostración...</p>
          </div>
        </div>
      );
    }
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Show the main app when authenticated + synced + onboarded
  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        <div className={currentView === 'chat' ? 'h-full' : 'hidden'}>
          <ChatInterface />
        </div>
        <div className={currentView === 'dashboard' ? 'h-full' : 'hidden'}>
          <DashboardView />
        </div>
        <div className={currentView === 'history' ? 'h-full' : 'hidden'}>
          <QueryHistory />
        </div>
        <div className={currentView === 'schema' ? 'h-full' : 'hidden'}>
          <SchemaExplorer />
        </div>
      </div>
    </AppLayout>
  );
}
