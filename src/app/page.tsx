'use client';

import { AppLayout } from '@/components/app/app-layout';
import { ChatInterface } from '@/components/app/chat/chat-interface';
import { DashboardView } from '@/components/app/dashboard/dashboard-view';
import { QueryHistory } from '@/components/app/history/query-history';
import { SchemaExplorer } from '@/components/app/sidebar/schema-explorer';
import { useAppStore } from '@/stores/app-store';
import { useAuth } from '@/components/auth/AuthProvider';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { currentView } = useAppStore();
  const { isAuthenticated, isLoading } = useAuth();

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

  // Show the main app when authenticated
  // Using hidden/visible instead of conditional rendering to preserve component state
  // and avoid re-fetching data when switching between views
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
