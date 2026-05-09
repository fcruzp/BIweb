'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useChatStore, type QueryResult, type VisualizationConfig, type StreamingStage } from '@/stores/chat-store';
import { useAIConfigStore } from '@/stores/ai-config-store';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';

export function MessageInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { activeDataSourceId, activeSessionId, setActiveSession, addChatSession } =
    useAppStore();
  const {
    addMessage, setLoading, setError, isLoading,
    setStreamingStage, setStreamingMessage,
    setCurrentSQL, setCurrentQueryResult, setCurrentVisualization,
  } = useChatStore();
  const { queryRowLimit } = useAIConfigStore();
  const { t } = useI18n();

  // Refs for streaming state that needs to be accessible across SSE events
  const currentSQLRef = useRef<string | null>(null);
  const currentQueryResultRef = useRef<QueryResult | null>(null);
  const currentVisualizationRef = useRef<VisualizationConfig | null>(null);
  const currentConfidenceRef = useRef<number>(0);

  const handleSubmit = async () => {
    if (!input.trim() || !activeDataSourceId || isLoading) return;

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
        const sessionRes = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataSourceId: activeDataSourceId,
            title: userMessage.slice(0, 50),
          }),
        });
        if (!sessionRes.ok) {
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
      }

      // Use fetch with streaming reader for SSE
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          dataSourceId: activeDataSourceId,
          sessionId: sessionId,
          queryRowLimit: queryRowLimit,
        }),
      });

      if (!res.ok) {
        // Try to parse error as JSON first (non-streaming error)
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await res.json();
          console.error('[Chat] API error response:', { status: res.status, error: errorData.error, detail: errorData.detail });
          throw new Error(errorData.detail || errorData.error || `Failed to process query (${res.status})`);
        } else {
          console.error('[Chat] API non-JSON error:', { status: res.status, contentType });
          throw new Error(`Server error: ${res.status}`);
        }
      }

      // Read the SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events (separated by double newlines)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
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

                // Update SQL in streaming message if provided
                if (event.sql) {
                  currentSQLRef.current = event.sql;
                  setCurrentSQL(event.sql);
                }
                break;
              }

              case 'query_result': {
                // Query executed successfully — show results immediately!
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
                if (event.sessionId) {
                  setActiveSession(event.sessionId);
                }

                // Clear streaming state
                setStreamingStage(null);
                setStreamingMessage(null);
                setLoading(false);

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
                console.error('[Chat] SSE error event:', { error: errorMsg, detail: errorDetail });
                setError(errorMsg);
                toast.error(errorMsg);

                setStreamingStage(null);
                setStreamingMessage(null);
                setLoading(false);

                addMessage({
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `Error: ${errorMsg}${errorDetail ? `\n\nDetails: ${errorDetail}` : ''}`,
                  timestamp: new Date(),
                });
                break;
              }
            }
          } catch (parseError) {
            // Ignore malformed SSE events
            console.warn('Failed to parse SSE event:', parseError, jsonStr);
          }
        }
      }

      // Safety: if we exit the loop without a 'complete' event, clean up
      setStreamingStage(null);
      setStreamingMessage(null);
      setLoading(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error('[Chat] Fatal error in handleSubmit:', error);
      setError(errorMessage);
      toast.error(errorMessage);

      setStreamingStage(null);
      setStreamingMessage(null);
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
            disabled={!input.trim() || !activeDataSourceId || isLoading}
            size="icon"
            className="h-11 w-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          {t('inputHint')}
        </p>
      </div>
    </div>
  );
}
