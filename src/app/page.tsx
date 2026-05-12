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

export default function Home() {
  const { currentView, setActiveDataSource } = useAppStore();
  const { isAuthenticated, isLoading, showOnboarding, completeOnboarding, dbUser } = useAuth();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const { t } = useI18n();
  const checkoutTriggeredRef = useRef(false);

  // Handle billing redirect notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (billing === 'success') {
      toast.success(t('billingSuccess'));
      window.history.replaceState({}, '', '/');
    } else if (billing === 'cancelled') {
      toast.info(t('billingCancelled'));
      window.history.replaceState({}, '/');
    }
  }, [t]);

  // Auto-trigger checkout for pending upgrade plan
  // When a user signs up from a pricing CTA, they have a plan saved in sessionStorage.
  // After onboarding completes (or is skipped), we auto-trigger the Stripe checkout.
  useEffect(() => {
    if (checkoutTriggeredRef.current) return;
    if (!isAuthenticated || isLoading || showOnboarding) return;

    const pendingPlan = getPendingUpgradePlan();
    if (!pendingPlan) return;

    checkoutTriggeredRef.current = true;

    const triggerCheckout = async () => {
      try {
        const res = await authFetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: pendingPlan, billingPeriod: 'monthly' }),
        });

        if (!res.ok) {
          throw new Error('Failed to create checkout session');
        }

        const data = await res.json();
        // Clear the pending plan before navigating away
        clearPendingUpgradePlan();

        if (data.url) {
          // Navigate to Stripe checkout (or mock checkout)
          window.location.href = data.url;
        }
      } catch (err) {
        console.warn('[Home] Auto-checkout failed:', err);
        clearPendingUpgradePlan();
        // Show a toast so the user knows something was supposed to happen
        toast.info(t('billingUpgradePending'));
      }
    };

    // Small delay to ensure the app is fully loaded and auth state is settled
    const timer = setTimeout(triggerCheckout, 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, showOnboarding, t]);

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

  // Show the main app when authenticated
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
