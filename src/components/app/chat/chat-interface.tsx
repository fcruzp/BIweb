'use client';

import { useAppStore } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { WelcomeScreen } from './welcome-screen';
import { Brain } from 'lucide-react';

export function ChatInterface() {
  const { activeDataSourceId, dataSources } = useAppStore();
  const { isLoading } = useChatStore();

  const activeSource = dataSources.find((s) => s.id === activeDataSourceId);

  // No data source selected - show welcome
  if (!activeDataSourceId || !activeSource) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-border/50 px-4 py-3 flex items-center gap-3 bg-background/80 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
          <Brain className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{activeSource.name}</h2>
          <p className="text-[10px] text-muted-foreground">
            {activeSource.status === 'ready' ? 'Ready for queries' : activeSource.status}
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Processing...
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList />
      </div>

      {/* Input */}
      <MessageInput />
    </div>
  );
}
