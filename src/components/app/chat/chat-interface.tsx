'use client';

import { useAppStore } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { WelcomeScreen } from './welcome-screen';
import { ChatReport } from './chat-report';
import { Brain, MessageSquare, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useI18n } from '@/hooks/use-i18n';

export function ChatInterface() {
  const { activeDataSourceId, dataSources, activeSessionId, chatSessions } =
    useAppStore();
  const { isLoading, streamingStage, streamingElapsedMs, messages } = useChatStore();
  const [showReport, setShowReport] = useState(false);
  const { t } = useI18n();

  const activeSource = dataSources.find((s) => s.id === activeDataSourceId);
  const activeChat = chatSessions.find((s) => s.id === activeSessionId);

  // No data source selected - show welcome
  if (!activeDataSourceId || !activeSource) {
    return <WelcomeScreen />;
  }

  // Report overlay
  if (showReport) {
    return <ChatReport onClose={() => setShowReport(false)} />;
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-border/50 px-4 py-3 flex items-center gap-3 bg-background/80 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
          {activeChat ? (
            <MessageSquare className="h-4 w-4" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">
            {activeChat?.title || activeSource.name}
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {activeChat
              ? activeSource.name
              : activeSource.status === 'ready'
                ? t('readyForQueries')
                : activeSource.status}
          </p>
        </div>
        {isLoading && streamingStage && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {streamingStage.message}
            {streamingElapsedMs > 0 && (
              <span className="inline-flex items-center gap-0.5 font-mono text-[10px]">
                <Clock className="h-2.5 w-2.5" />
                {Math.floor(streamingElapsedMs / 1000)}s
              </span>
            )}
          </div>
        )}
        {isLoading && !streamingStage && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('processing')}
          </div>
        )}
        {hasMessages && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => setShowReport(true)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t('report')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t('generateReport')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
