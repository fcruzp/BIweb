'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useChatStore, type StreamingStage } from '@/stores/chat-store';
import { useAppStore } from '@/stores/app-store';
import { MessageItem } from './message-item';
import {
  Loader2,
  Brain,
  Code2,
  Database,
  Sparkles,
  RefreshCw,
  Clock,
  MessageSquare,
  Table2,
  BarChart3,
  TrendingUp,
  List,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/hooks/use-i18n';

// Stage icon mapping
function StageIcon({ stage }: { stage: string }) {
  switch (stage) {
    case 'generating_sql':
      return <Code2 className="h-4 w-4 text-blue-400" />;
    case 'executing':
      return <Database className="h-4 w-4 text-emerald-400" />;
    case 'retrying':
      return <RefreshCw className="h-4 w-4 text-amber-400" />;
    case 'analyzing':
      return <Sparkles className="h-4 w-4 text-purple-400" />;
    default:
      return <Brain className="h-4 w-4" />;
  }
}

/**
 * Format milliseconds into a human-readable string: "5s", "1m 23s", etc.
 */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

// Stage progress indicator with elapsed time
function StreamingProgress({ stage, elapsedMs }: { stage: StreamingStage; elapsedMs: number }) {
  const { t } = useI18n();
  // Define completed stages for progress tracking
  const stageOrder = ['generating_sql', 'executing', 'retrying', 'analyzing'];
  const currentIdx = stageOrder.indexOf(stage.stage);

  // Determine if we should show a "taking longer than usual" hint
  const isSlow = elapsedMs > 15000; // 15 seconds
  const isVerySlow = elapsedMs > 30000; // 30 seconds

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
        <StageIcon stage={stage.stage} />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{stage.message}</span>
          {/* Elapsed time badge */}
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted/50 ml-1">
            <Clock className="h-2.5 w-2.5" />
            {formatElapsed(elapsedMs)}
          </span>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {stageOrder.map((s, i) => {
            // Skip 'retrying' if not in retry mode
            if (s === 'retrying' && stage.stage !== 'retrying' && currentIdx < 3) {
              // Only show retry if we're actually retrying
              return null;
            }

            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;

            return (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'w-6 bg-emerald-500'
                    : isCurrent
                      ? 'w-8 bg-emerald-500/60 animate-pulse'
                      : 'w-4 bg-muted-foreground/20'
                }`}
              />
            );
          })}
        </div>
        {/* Show SQL if available during execution */}
        {stage.sql && (
          <div className="text-[10px] font-mono text-muted-foreground/70 bg-muted/30 rounded px-2 py-1 max-w-md truncate">
            {stage.sql}
          </div>
        )}
        {/* "Taking longer" hint with stage-specific messages */}
        {isVerySlow && (
          <p className="text-[11px] text-amber-500/80 animate-pulse">
            {stage.stage === 'generating_sql'
              ? t('slowGenerating')
              : stage.stage === 'analyzing'
                ? t('slowAnalyzing')
                : t('slowDefault')}
          </p>
        )}
        {isSlow && !isVerySlow && (
          <p className="text-[11px] text-muted-foreground/60">
            {t('slowProcessing')}
          </p>
        )}
      </div>
    </div>
  );
}

export function MessageList() {
  const { messages, isLoading, streamingStage, streamingMessage, streamingElapsedMs } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  // Local elapsed time counter — increments every second while loading
  // This provides a smooth counter even between heartbeat events
  const [localElapsed, setLocalElapsed] = useState(0);
  const loadingStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoading) {
      // Reset when not loading
      loadingStartRef.current = 0;
      return;
    }
    if (loadingStartRef.current === 0) {
      loadingStartRef.current = Date.now();
    }
    const interval = setInterval(() => {
      if (loadingStartRef.current > 0) {
        setLocalElapsed(Date.now() - loadingStartRef.current);
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      // Reset local elapsed when loading stops
      setLocalElapsed(0);
    };
  }, [isLoading]);

  // Use the server's elapsed_ms if available (from heartbeat), otherwise fall back to local counter
  const displayElapsed = streamingElapsedMs > 0 ? streamingElapsedMs : localElapsed;

  // Auto-scroll to bottom when new messages arrive or streaming state changes
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading, streamingStage, streamingMessage, localElapsed]);

  if (messages.length === 0 && !isLoading) {
    return <EmptyChat />;
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {/* Show streaming progress when loading */}
        {isLoading && streamingStage && (
          <StreamingProgress stage={streamingStage} elapsedMs={displayElapsed} />
        )}

        {/* Show streaming message with partial results if available */}
        {isLoading && streamingMessage && (streamingMessage.queryResult || streamingMessage.sqlQuery) && (
          <div className="opacity-80">
            <MessageItem
              message={{
                id: streamingMessage.id || crypto.randomUUID(),
                role: 'assistant',
                content: streamingMessage.content || '',
                sqlQuery: streamingMessage.sqlQuery || null,
                queryResult: streamingMessage.queryResult || null,
                visualization: streamingMessage.visualization || null,
                confidence: streamingMessage.confidence,
                timestamp: streamingMessage.timestamp || new Date(),
              }}
            />
            {/* Indicator that analysis is still in progress */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 ml-11">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t('analyzingInProgress') || 'Analysis in progress...'}</span>
              <span className="font-mono text-[10px]">({formatElapsed(displayElapsed)})</span>
            </div>
          </div>
        )}

        {/* Fallback: just show spinner if loading but no streaming stage yet */}
        {isLoading && !streamingStage && (
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
              <Brain className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('connectingServer')}</span>
              {displayElapsed > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground/60">({formatElapsed(displayElapsed)})</span>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function EmptyChat() {
  const { activeDataSourceId, dataSources } = useAppStore();
  const { setPendingSuggestion } = useChatStore();
  const activeSource = dataSources.find((s) => s.id === activeDataSourceId);
  const { t } = useI18n();

  // Build contextual suggestions based on the selected datasource schema
  const suggestions = useMemo(() => {
    if (!activeSource?.schemas?.length) {
      // No schema info — use generic suggestions
      return [
        { text: t('suggestShowTables'), icon: <Table2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> },
        { text: t('suggestTopRecords'), icon: <TrendingUp className="h-3.5 w-3.5 shrink-0 text-blue-500" /> },
        { text: t('suggestCountByCategory'), icon: <BarChart3 className="h-3.5 w-3.5 shrink-0 text-amber-500" /> },
        { text: t('suggestNumericStats'), icon: <List className="h-3.5 w-3.5 shrink-0 text-purple-500" /> },
      ];
    }

    const result: Array<{ text: string; icon: React.ReactNode }> = [];

    // Always offer the table overview
    result.push({
      text: t('suggestShowTables'),
      icon: <Table2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />,
    });

    // Pick the largest table for contextual suggestions
    const schemas = activeSource.schemas;
    const largestTable = schemas.reduce((prev, curr) =>
      (curr.rowCount || 0) > (prev.rowCount || 0) ? curr : prev
    , schemas[0]);

    // Parse columns to find a categorical column and a numeric column
    let categoricalColumn = '';
    let numericColumn = '';
    try {
      const cols = JSON.parse(largestTable.columns) as Array<{
        name: string; type: string;
      }>;
      // Find a text-like column for grouping
      const textCol = cols.find(c =>
        /text|varchar|char|string/i.test(c.type) && !/id|_id|uuid/i.test(c.name)
      );
      if (textCol) categoricalColumn = textCol.name;
      // Find a numeric column for stats
      const numCol = cols.find(c =>
        /int|float|double|decimal|numeric|real|number/i.test(c.type) && !/id|_id/i.test(c.name)
      );
      if (numCol) numericColumn = numCol.name;
    } catch { /* ignore */ }

    const tableName = largestTable.tableName;

    // Table overview suggestion
    result.push({
      text: t('suggestTableOverview', { table: tableName }),
      icon: <MessageSquare className="h-3.5 w-3.5 shrink-0 text-blue-500" />,
    });

    // Top records suggestion
    result.push({
      text: t('suggestTopInTable', { table: tableName }),
      icon: <TrendingUp className="h-3.5 w-3.5 shrink-0 text-amber-500" />,
    });

    // If we found a categorical column, suggest grouping
    if (categoricalColumn) {
      result.push({
        text: t('suggestCountByColumn', { table: tableName, column: categoricalColumn }),
        icon: <BarChart3 className="h-3.5 w-3.5 shrink-0 text-purple-500" />,
      });
    }

    // If we found a numeric column, suggest stats
    if (numericColumn) {
      result.push({
        text: t('suggestStatsColumn', { table: tableName, column: numericColumn }),
        icon: <List className="h-3.5 w-3.5 shrink-0 text-rose-500" />,
      });
    }

    // If multiple tables, suggest relationships
    if (schemas.length > 1) {
      result.push({
        text: t('suggestRelationships'),
        icon: <Database className="h-3.5 w-3.5 shrink-0 text-teal-500" />,
      });
    }

    // Limit to 5 suggestions max
    return result.slice(0, 5);
  }, [activeSource, t]);

  const handleSuggestionClick = (text: string) => {
    setPendingSuggestion(text);
  };

  // No datasource selected
  if (!activeDataSourceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-lg mx-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-500 mb-4">
          <Database className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-center mb-1">
          {t('emptyChatNoSource')}
        </h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 max-w-lg mx-auto">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-500 mb-4">
        <Brain className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-center mb-1">
        {t('emptyChatTitle')}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        {t('emptyChatSubtitle')}
      </p>
      <div className="grid gap-2 w-full">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => handleSuggestionClick(suggestion.text)}
            className="flex items-center gap-2.5 text-left text-sm p-3 rounded-lg border border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors group"
          >
            {suggestion.icon}
            <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
