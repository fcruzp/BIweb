'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAppStore } from '@/stores/app-store';
import { MessageItem } from './message-item';
import { Loader2, Brain } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MessageList() {
  const { messages, isLoading } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return <EmptyChat />;
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
              <Brain className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing your question and generating query...</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function EmptyChat() {
  const { activeDataSourceId, dataSources } = useAppStore();
  const activeSource = dataSources.find((s) => s.id === activeDataSourceId);

  const suggestions = [
    'Show me all tables and their row counts',
    'What are the top 10 records by value?',
    'Count records grouped by category',
    'What is the average, min, and max of numeric columns?',
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 max-w-lg mx-auto">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-500 mb-4">
        <Brain className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-center mb-1">
        Ask a question about your data
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Type a question in natural language and I&apos;ll generate a SQL query, execute it, and visualize the results.
      </p>
      <div className="grid gap-2 w-full">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            className="text-left text-sm p-3 rounded-lg border border-border/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
