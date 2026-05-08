'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { useAIConfigStore } from '@/stores/ai-config-store';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function MessageInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { activeDataSourceId, activeSessionId, setActiveSession, addChatSession } =
    useAppStore();
  const { addMessage, setLoading, setError, isLoading } = useChatStore();
  const { queryRowLimit } = useAIConfigStore();

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
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process query');
      }

      const data = await res.json();

      // Add assistant message
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message.content,
        sqlQuery: data.message.sqlQuery || null,
        explanation: data.message.explanation,
        confidence: data.message.confidence,
        queryResult: data.message.queryResult || null,
        visualization: data.message.visualization || null,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
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
                  ? 'Ask a question about your data...'
                  : 'Select a data source first...'
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
          DataMind generates safe SELECT queries only. Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
