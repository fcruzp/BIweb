'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useChatStore, type QueryResult, type VisualizationConfig, type StreamingStage } from '@/stores/chat-store';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch } from '@/lib/fetch-utils';
import { useUsageLimits } from '@/hooks/use-usage-limits';
import { Lock, AlertTriangle } from 'lucide-react';

// Step log entry for display in console
interface StepLogEntry {
  step: string;
  duration_ms: number;
  overall_ms?: number;
  detail?: string;
  status: 'start' | 'done' | 'error';
}

export function MessageInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { activeDataSourceId, activeSessionId, setActiveSession, addChatSession } =
    useAppStore();
  const {
    addMessage, setLoading, setError, isLoading,
    setStreamingStage, setStreamingMessage,
    setCurrentSQL, setCurrentQueryResult, setCurrentVisualization,
    setStreamingElapsedMs,
    pendingSuggestion, clearPendingSuggestion,
  } = useChatStore();
  const { t } = useI18n();
  const { limits, refresh: refreshLimits } = useUsageLimits();

  // Consume pending suggestion from EmptyChat clicks
  useEffect(() => {
    if (pendingSuggestion) {
      setInput(pendingSuggestion);
      clearPendingSuggestion();
      // Focus the textarea after setting the suggestion
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [pendingSuggestion, clearPendingSuggestion]);

  // Refs for streaming state that needs to be accessible across SSE events
  const currentSQLRef = useRef<string | null>(null);
  const currentQueryResultRef = useRef<QueryResult | null>(null);
  const currentVisualizationRef = useRef<VisualizationConfig | null>(null);
  const currentConfidenceRef = useRef<number>(0);

  const handleSubmit = async () => {
    if (!input.trim() || !activeDataSourceId || isLoading) return;

    // Frontend query limit check — block before making the API call
    if (limits.queries.atLimit) {
      toast.error(t('limitReached'), {
        description: t('queriesLimitMessage', { limit: String(limits.queries.limit) }),
      });
      return;
    }

    // Frontend chat session limit check — only if no active session (auto-create will be triggered)
    if (!activeSessionId && limits.chatSessions.atLimit) {
      toast.error(t('limitReached'), {
        description: t('chatSessionsLimitMessage', { limit: String(limits.chatSessions.limit) }),
      });
      return;
    }

    const userMessage = input.trim();
    setInput('');

    // Add user message to store
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    setLoading(true);
    setError(null);

    // Initialize streaming state
    const initialStage: StreamingStage = {
      stage: 'generating_sql',
      message: t('stageGeneratingSQL') || 'Generating SQL query...',
    };
    setStreamingStage(initialStage);
    setStreamingMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    });

    // Reset refs
    currentSQLRef.current = null;
    currentQueryResultRef.current = null;
    currentVisualizationRef.current = null;
    currentConfidenceRef.current = 0;

    try {
      // If no active session, create one first
      let sessionId = activeSessionId;
      if (!sessionId) {
        const sessionRes = await authFetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataSourceId: activeDataSourceId,
            title: userMessage.slice(0, 50),
          }),
        });
        if (!sessionRes.ok) {
          if (sessionRes.status === 403) {
            const data = await sessionRes.json().catch(() => ({}));
            toast.error(t('limitReached'), {
              description: data.error as string || t('chatSessionsLimitMessage', { limit: String(limits.chatSessions.limit) }),
            });
            refreshLimits();
            // Clean up the loading state we set above
            setStreamingStage(null);
            setStreamingMessage(null);
            setStreamingElapsedMs(0);
            setLoading(false);
            return;
          }
          throw new Error('Failed to create chat session');
        }
        const sessionData = await sessionRes.json();
        sessionId = sessionData.session.id;
        setActiveSession(sessionId);
        addChatSession({
          id: sessionData.session.id,
          title: sessionData.session.title,
          dataSourceId: sessionData.session.dataSourceId,
          createdAt: sessionData.session.createdAt,
          updatedAt: sessionData.session.updatedAt,
        });
        // Refresh limits so the + button updates (may now be at the chat session limit)
        refreshLimits();
      }

      // ──────────────────────────────────────────────────────────
      // SSE Streaming Strategy
      // ──────────────────────────────────────────────────────────
      // 1. CONNECTION_TIMEOUT (30s): If no response headers received in 30s, abort.
      //    The server should send the "connected" SSE event very quickly (< 1s).
      // 2. IDLE_TIMEOUT (60s): Once SSE stream is flowing, if no data chunk received
      //    for 60 seconds, abort. The server sends heartbeats every 3s, so 60s
      //    means 20 missed heartbeats = definitely dead.
      // ──────────────────────────────────────────────────────────
      console.log('[Chat] 🚀 Sending query to /api/chat...');
      const fetchStart = Date.now();
      const abortController = new AbortController();

      const CONNECTION_TIMEOUT_MS = 30_000; // 30s to get initial response
      const IDLE_TIMEOUT_MS = 60_000;       // 60s idle once stream is flowing
      let isStreamConnected = false;
      let eventCount = 0;

      // Start connection timeout
      let idleTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        console.error(`[Chat] ⏰ Connection timeout: no response in ${CONNECTION_TIMEOUT_MS / 1000}s, aborting`);
        abortController.abort();
      }, CONNECTION_TIMEOUT_MS);

      function resetIdleTimer() {
        const currentTimeout = isStreamConnected ? IDLE_TIMEOUT_MS : CONNECTION_TIMEOUT_MS;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          const phase = isStreamConnected ? 'idle' : 'connection';
          console.error(`[Chat] ⏰ ${phase} timeout: no data for ${currentTimeout / 1000}s, aborting (events received: ${eventCount})`);
          abortController.abort();
        }, currentTimeout);
      }

      function markStreamConnected() {
        isStreamConnected = true;
        console.log(`[Chat] ✅ Stream connected! Switching from connection timeout (${CONNECTION_TIMEOUT_MS / 1000}s) to idle timeout (${IDLE_TIMEOUT_MS / 1000}s)`);
        resetIdleTimer();
      }

      let res: Response;
      try {
        res = await authFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            dataSourceId: activeDataSourceId,
            sessionId: sessionId,
          }),
          signal: abortController.signal,
        });
      } catch (fetchError) {
        if (idleTimer) clearTimeout(idleTimer);
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          throw new Error('No se recibió respuesta del servidor. Verifica tu conexión e inténtalo de nuevo.');
        }
        throw fetchError;
      }

      const timeToHeaders = Date.now() - fetchStart;
      console.log(`[Chat] 📥 Response headers received in ${timeToHeaders}ms (status=${res.status}, contentType=${res.headers.get('content-type')})`);

      if (!res.ok) {
        if (idleTimer) clearTimeout(idleTimer);
        // Try to parse error as JSON first (non-streaming error)
        const contentType = res.headers.get('content-type') || '';
        console.error(`[Chat] ❌ API error: status=${res.status}, contentType=${contentType}, time=${Date.now() - fetchStart}ms`);
        if (contentType.includes('application/json')) {
          const errorData = await res.json();
          console.error('[Chat] API error response:', { status: res.status, error: errorData.error, detail: errorData.detail });
          throw new Error(errorData.detail || errorData.error || `Failed to process query (${res.status})`);
        } else {
          console.error('[Chat] API non-JSON error:', { status: res.status, contentType });
          if (res.status === 504) {
            throw new Error('La consulta tardó demasiado y el servidor canceló la conexión. Intenta reformular tu pregunta de forma más simple o inténtalo de nuevo.');
          }
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // Read the SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        if (idleTimer) clearTimeout(idleTimer);
        throw new Error('No response stream');
      }

      console.log(`[Chat] 📡 SSE reader acquired, reading stream...`);
      markStreamConnected(); // Switch from connection timeout to idle timeout

      const decoder = new TextDecoder();
      let buffer = '';
      // Collect step logs for final summary
      const stepLogs: StepLogEntry[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[Chat] 🏁 Stream ended naturally (total events: ${eventCount}, total time: ${Date.now() - fetchStart}ms)`);
          break;
        }

        // Reset idle timer — we received data
        resetIdleTimer();

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events (separated by double newlines)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          // Skip SSE comments (lines starting with ':')
          if (line.startsWith(':')) continue;

          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            eventCount++;

            switch (event.type) {
              case 'connected': {
                console.log(`[Chat] ✅ SSE "connected" event received — stream is live (time: ${Date.now() - fetchStart}ms, event #${eventCount})`);
                break;
              }

              case 'heartbeat': {
                // Server heartbeat — keep connection alive and update elapsed time
                if (typeof event.elapsed_ms === 'number') {
                  setStreamingElapsedMs(event.elapsed_ms);
                }
                // Log every 5th heartbeat to avoid spam
                if (eventCount % 5 === 0) {
                  console.log(`[Chat] 💓 Heartbeat received (event #${eventCount}, elapsed: ${event.elapsed_ms}ms)`);
                }
                break;
              }

              case 'log': {
                // Server-side step log — log to console for debugging
                const logEntry = event as StepLogEntry & { overall_ms?: number };
                stepLogs.push(logEntry);
                const icon = logEntry.status === 'done' ? '✅' : logEntry.status === 'error' ? '❌' : '⏳';
                const duration = logEntry.status !== 'start' ? ` (${logEntry.duration_ms}ms)` : '';
                const overall = logEntry.overall_ms ? ` [total: ${logEntry.overall_ms}ms]` : '';
                console.log(`[Chat] ${icon} STEP: ${logEntry.step}${duration}${overall}${logEntry.detail ? ` — ${logEntry.detail}` : ''}`);
                break;
              }

              case 'session':
                if (event.sessionId) {
                  setActiveSession(event.sessionId);
                }
                break;

              case 'stage': {
                const newStage: StreamingStage = {
                  stage: event.stage,
                  message: event.message,
                  sql: event.sql,
                  attempt: event.attempt,
                };
                setStreamingStage(newStage);
                console.log(`[Chat] 🔄 Stage: ${event.stage}`, event.sql ? `sql="${event.sql.slice(0, 80)}"` : '');

                // Update SQL in streaming message if provided
                if (event.sql) {
                  currentSQLRef.current = event.sql;
                  setCurrentSQL(event.sql);
                }
                break;
              }

              case 'query_result': {
                // Query executed successfully — show results immediately!
                console.log(`[Chat] 📊 Query result: rows=${(event.queryResult as QueryResult)?.rowCount}, time=${(event.queryResult as QueryResult)?.executionTime}ms`);
                currentSQLRef.current = event.sql;
                currentQueryResultRef.current = event.queryResult as QueryResult;
                currentVisualizationRef.current = event.visualization as VisualizationConfig;
                currentConfidenceRef.current = event.confidence || 0;

                setCurrentSQL(currentSQLRef.current);
                setCurrentQueryResult(currentQueryResultRef.current);
                setCurrentVisualization(currentVisualizationRef.current);

                // Update streaming message with partial results
                setStreamingMessage({
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: '',
                  sqlQuery: currentSQLRef.current,
                  queryResult: currentQueryResultRef.current,
                  visualization: currentVisualizationRef.current,
                  confidence: currentConfidenceRef.current,
                  timestamp: new Date(),
                });
                break;
              }

              case 'complete': {
                const finalMessage = event.message;
                const timing = event.timing as { total_ms: number } | undefined;
                console.log(`[Chat] ✅ Complete! contentLen=${finalMessage?.content?.length}, hasResult=${!!finalMessage?.queryResult}${timing ? `, total=${timing.total_ms}ms` : ''}`);
                if (event.sessionId) {
                  setActiveSession(event.sessionId);
                }

                // Print step timing summary
                if (stepLogs.length > 0) {
                  console.log('[Chat] ═══ STEP TIMING SUMMARY ═══');
                  const doneSteps = stepLogs.filter(l => l.status === 'done' || l.status === 'error');
                  for (const s of doneSteps) {
                    const icon = s.status === 'done' ? '✅' : '❌';
                    console.log(`[Chat] ${icon} ${s.step}: ${s.duration_ms}ms${s.detail ? ` — ${s.detail}` : ''}`);
                  }
                  console.log(`[Chat] ═══ TOTAL: ${timing?.total_ms || Date.now() - fetchStart}ms ═══`);
                }

                // Clear streaming state
                setStreamingStage(null);
                setStreamingMessage(null);
                setStreamingElapsedMs(0);
                setLoading(false);

                // Refresh usage limits after a query completes (consumes a query from the quota)
                refreshLimits();

                // Add the complete assistant message
                addMessage({
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: finalMessage.content,
                  sqlQuery: finalMessage.sqlQuery || currentSQLRef.current,
                  explanation: finalMessage.explanation,
                  confidence: finalMessage.confidence ?? currentConfidenceRef.current,
                  queryResult: finalMessage.queryResult || currentQueryResultRef.current,
                  visualization: finalMessage.visualization || currentVisualizationRef.current,
                  timestamp: new Date(),
                });

                // Reset refs
                currentSQLRef.current = null;
                currentQueryResultRef.current = null;
                currentVisualizationRef.current = null;
                currentConfidenceRef.current = 0;
                break;
              }

              case 'error': {
                const errorMsg = event.error || 'An error occurred';
                const errorDetail = event.detail || '';
                console.error('[Chat] ❌ SSE error event:', { error: errorMsg, detail: errorDetail });
                setError(errorMsg);
                toast.error(errorMsg);

                setStreamingStage(null);
                setStreamingMessage(null);
                setStreamingElapsedMs(0);
                setLoading(false);

                addMessage({
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `Error: ${errorMsg}${errorDetail ? `\n\nDetails: ${errorDetail}` : ''}`,
                  timestamp: new Date(),
                });
                break;
              }

              default: {
                console.log(`[Chat] 📨 Unknown SSE event type: ${event.type}`, event);
              }
            }
          } catch (parseError) {
            // Ignore malformed SSE events
            console.warn('[Chat] Failed to parse SSE event:', parseError, jsonStr);
          }
        }
      }

      // Clean up idle timer
      if (idleTimer) clearTimeout(idleTimer);

      // Safety: if we exit the loop without a 'complete' event, clean up
      setStreamingStage(null);
      setStreamingMessage(null);
      setStreamingElapsedMs(0);
      setLoading(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error('[Chat] 💥 Fatal error in handleSubmit:', error);
      setError(errorMessage);
      toast.error(errorMessage);

      setStreamingStage(null);
      setStreamingMessage(null);
      setStreamingElapsedMs(0);
      setLoading(false);

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeDataSourceId
                  ? t('typeQuestion')
                  : t('selectDataSourceFirst')
              }
              disabled={!activeDataSourceId || isLoading}
              className="min-h-[44px] max-h-[200px] resize-none pr-4 bg-muted/30 border-border/50 focus-visible:ring-emerald-500/50"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || !activeDataSourceId || isLoading || limits.queries.atLimit}
            size="icon"
            className={`h-11 w-11 rounded-lg shrink-0 ${limits.queries.atLimit ? 'bg-muted text-muted-foreground' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {limits.queries.atLimit ? (
              <Lock className="h-4 w-4" />
            ) : isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Query limit warning */}
        {limits.queries.nearLimit && !limits.queries.atLimit && (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>
              {limits.queries.limit !== null
                ? t('queriesNearLimit', { used: String(limits.queries.used), limit: String(limits.queries.limit) })
                : ''}
            </span>
          </div>
        )}
        {limits.queries.atLimit && (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[10px] text-red-600 dark:text-red-400">
            <Lock className="h-3 w-3 shrink-0" />
            <span>{t('queriesLimitMessage', { limit: String(limits.queries.limit) })}</span>
          </div>
        )}
        {!limits.queries.nearLimit && !limits.queries.atLimit && (
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            {t('inputHint')}
          </p>
        )}
      </div>
    </div>
  );
}
