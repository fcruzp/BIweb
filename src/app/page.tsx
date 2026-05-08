'use client';

import { AppLayout } from '@/components/app/app-layout';
import { ChatInterface } from '@/components/app/chat/chat-interface';
import { DashboardView } from '@/components/app/dashboard/dashboard-view';
import { QueryHistory } from '@/components/app/history/query-history';
import { SchemaExplorer } from '@/components/app/sidebar/schema-explorer';
import { useAppStore } from '@/stores/app-store';

export default function Home() {
  const { currentView } = useAppStore();

  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        {currentView === 'chat' && <ChatInterface />}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'history' && <QueryHistory />}
        {currentView === 'schema' && <SchemaExplorer />}
      </div>
    </AppLayout>
  );
}
