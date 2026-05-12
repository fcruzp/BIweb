'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { useHistoryStore, type HistoryItem } from '@/stores/history-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, Clock, CheckCircle2, AlertCircle, Play, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/fetch-utils';
import { generateId } from '@/lib/client-uuid';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/components/auth/AuthProvider';

export function QueryHistory() {
  const { activeDataSourceId } = useAppStore();
  const { addMessage, setLoading } = useChatStore();
  const { history, historyLoading, lastDataSourceId, setHistory, setHistoryLoading, setLastDataSourceId } = useHistoryStore();
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();

  // Stale-while-revalidate: show cached data immediately, refresh in background
  useEffect(() => {
    if (!activeDataSourceId) {
      setHistory([]);
      setLastDataSourceId(null);
      return;
    }
    if (!isAuthenticated) return; // Don't fetch if not authenticated

    async function loadHistory() {
      setHistoryLoading(true);
      setLastDataSourceId(activeDataSourceId);
      try {
        const res = await authFetch(`/api/history?dataSourceId=${activeDataSourceId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch {
        // silently ignore — cached data still shown
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [activeDataSourceId, setHistory, setHistoryLoading, setLastDataSourceId]);

  const handleReRun = async (item: HistoryItem) => {
    addMessage({
      id: generateId(),
      role: 'user',
      content: item.naturalQuery,
      timestamp: new Date(),
    });

    setLoading(true);
    try {
      const res = await authFetch('/api/chat', {
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
          id: generateId(),
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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sql);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = sql;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    toast.success('SQL copied to clipboard');
  };

  if (!activeDataSourceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">{t('noDataSourceSelected')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('selectDataSourceForHistory')}
        </p>
      </div>
    );
  }

  // Show cached data with a subtle loading indicator instead of full spinner
  if (historyLoading && history.length === 0) {
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
        <h3 className="text-lg font-semibold text-muted-foreground">{t('noHistory')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('noHistoryDesc')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{t('queryHistory')}</h2>
            {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <Badge variant="secondary">{history.length} {t('queries')}</Badge>
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
                        {t('success')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-red-500 gap-1 text-[10px]">
                        <AlertCircle className="h-3 w-3" />
                        {t('error')}
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
                    <span>{item.rowCount} {t('rows')}</span>
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
                      {t('copy')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-emerald-500 hover:text-emerald-600"
                      onClick={() => handleReRun(item)}
                    >
                      <Play className="h-3 w-3" />
                      {t('reRun')}
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
