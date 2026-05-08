'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, Clock, CheckCircle2, AlertCircle, Play, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  naturalQuery: string;
  sqlQuery: string;
  rowCount: number;
  executionTime: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export function QueryHistory() {
  const { activeDataSourceId } = useAppStore();
  const { addMessage, setLoading } = useChatStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoadingState] = useState(false);

  useEffect(() => {
    if (!activeDataSourceId) {
      setHistory([]);
      return;
    }

    async function loadHistory() {
      setLoadingState(true);
      try {
        const res = await fetch(`/api/history?dataSourceId=${activeDataSourceId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoadingState(false);
      }
    }

    loadHistory();
  }, [activeDataSourceId]);

  const handleReRun = async (item: HistoryItem) => {
    // Re-run the query by sending the natural language question again
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: item.naturalQuery,
      timestamp: new Date(),
    });

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: item.naturalQuery,
          dataSourceId: activeDataSourceId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
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
      }
    } catch (error) {
      toast.error('Failed to re-run query');
    } finally {
      setLoading(false);
    }
  };

  const copySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.success('SQL copied to clipboard');
  };

  if (!activeDataSourceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Data Source Selected</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select a data source to view query history.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Query History</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your query history will appear here after you start asking questions.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Query History</h2>
          <Badge variant="secondary">{history.length} queries</Badge>
        </div>

        <div className="space-y-3">
          {history.map((item) => (
            <Card key={item.id} className="border-border/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium flex-1">{item.naturalQuery}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === 'success' ? (
                      <Badge variant="secondary" className="text-emerald-500 gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-red-500 gap-1 text-[10px]">
                        <AlertCircle className="h-3 w-3" />
                        Error
                      </Badge>
                    )}
                  </div>
                </div>

                <pre className="bg-muted/50 border border-border/50 rounded p-2 text-xs font-mono overflow-x-auto">
                  {item.sqlQuery}
                </pre>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.executionTime}ms
                    </span>
                    <span>{item.rowCount} rows</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => copySQL(item.sqlQuery)}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-emerald-500 hover:text-emerald-600"
                      onClick={() => handleReRun(item)}
                    >
                      <Play className="h-3 w-3" />
                      Re-run
                    </Button>
                  </div>
                </div>

                {item.errorMessage && (
                  <p className="text-xs text-red-500">{item.errorMessage}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
