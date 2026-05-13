'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useHistoryStore } from '@/stores/history-store';
import { useChatStore } from '@/stores/chat-store';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Database, Loader2, AlertCircle, CheckCircle2, Trash2, Info, RefreshCw } from 'lucide-react';
import { DataSourceInfoDialog } from './datasource-info-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch, isAuthError } from '@/lib/fetch-utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUsageLimits } from '@/hooks/use-usage-limits';

export function DataSourceList() {
  const {
    dataSources,
    dataSourcesLoading,
    setDataSources,
    setDataSourcesLoading,
    activeDataSourceId,
    setActiveDataSource,
    removeDataSource,
    removeChatSessionsByDataSourceId,
    updateDataSource,
  } = useAppStore();
  const { removeWidgetsByDataSourceId } = useDashboardStore();
  const { clearHistoryByDataSourceId } = useHistoryStore();
  const { clearMessages } = useChatStore();

  const [infoDataSourceId, setInfoDataSourceId] = useState<string | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDone = useRef(false);
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const { refresh: refreshLimits } = useUsageLimits();

  // Background refresh — fetches latest data and updates the store silently.
  // If cached data exists (from Zustand persist), we render it immediately
  // and refresh in the background. No spinner needed.
  const loadDataSources = useCallback(async (showLoading = false) => {
    if (showLoading) setDataSourcesLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/datasources');
      if (res.ok) {
        const data = await res.json();
        setDataSources(data.datasources);
        // VALIDATION: Clear stale activeDataSourceId if it's no longer in the list.
        // This happens after DB resets, account changes, or when datasources are deleted
        // from another session. Without this, components keep fetching with a stale ID → 404 floods.
        const currentActiveId = useAppStore.getState().activeDataSourceId;
        if (currentActiveId && !data.datasources.some((ds: { id: string }) => ds.id === currentActiveId)) {
          console.log(`[DataSourceList] Clearing stale activeDataSourceId: ${currentActiveId} (not in fetched list)`);
          setActiveDataSource(null);
          clearMessages();
        }
      } else if (isAuthError(res)) {
        // Don't retry on 401 — AuthProvider will handle session recovery
        // Show cached data if available, otherwise show auth error
        if (dataSources.length === 0) {
          setError('Session expired. Please sign in again.');
        }
        // Don't log 401s to avoid console spam
      } else {
        setError(`Failed to load data sources (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      if (showLoading) setDataSourcesLoading(false);
    }
  }, [setDataSources, setDataSourcesLoading, dataSources.length, setActiveDataSource, clearMessages]);

  // Initial fetch — background refresh if we have cached data, blocking if empty
  useEffect(() => {
    if (initialFetchDone.current) return;
    if (!isAuthenticated) return; // Don't fetch if not authenticated
    initialFetchDone.current = true;
    // If we already have cached data, refresh in background (no spinner)
    // If no cached data, show loading spinner
    loadDataSources(dataSources.length === 0);
  }, [isAuthenticated]);

  // Poll for "analyzing" status changes
  useEffect(() => {
    const hasAnalyzing = dataSources.some(ds => ds.status === 'analyzing');

    if (hasAnalyzing && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await authFetch('/api/datasources');
          if (isAuthError(res)) {
            // Stop polling on 401 — session expired
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            return;
          }
          if (res.ok) {
            const data = await res.json();
            setDataSources(data.datasources);

            // Stop polling if no more analyzing sources
            if (!data.datasources.some((ds: { status: string }) => ds.status === 'analyzing')) {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }
          }
        } catch {
          // Ignore polling errors
        }
      }, 5000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [dataSources, setDataSources]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/datasources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Clean up all stores that reference this dataSource
        removeDataSource(id);
        removeChatSessionsByDataSourceId(id);
        removeWidgetsByDataSourceId(id);
        clearHistoryByDataSourceId(id);
        // If this was the active dataSource, clear chat messages and reset selection
        if (activeDataSourceId === id) {
          setActiveDataSource(null);
          clearMessages();
        }
        // Refresh limits so the + button state updates immediately
        refreshLimits();
      }
    } catch (error) {
      console.error('Failed to delete data source:', error);
    }
  };

  const handleRetryAnalyze = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Update local state immediately
      updateDataSource(id, { status: 'analyzing' });
      const res = await authFetch(`/api/datasources/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.datasource) {
          updateDataSource(id, data.datasource);
        }
        console.log('[DatasourceList] Retry analysis completed:', id);
      } else {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          errorDetail = errorData.detail || errorData.error || errorDetail;
          console.error('[DatasourceList] Retry analysis FAILED:', { id, status: res.status, error: errorData.error, detail: errorData.detail });
        } catch {
          console.error('[DatasourceList] Retry analysis FAILED:', { id, status: res.status });
        }
        // Re-fetch to get updated status from DB (background)
        loadDataSources(false);
      }
    } catch (err) {
      console.error('[DatasourceList] Retry analysis network error:', err);
    }
  };

  // Only show spinner when we have NO cached data AND we're loading
  if (dataSourcesLoading && dataSources.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && dataSources.length === 0) {
    return (
      <div className="px-2 py-4 text-center space-y-2">
        <p className="text-xs text-destructive">{error}</p>
        <button
          onClick={() => loadDataSources(true)}
          className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 mx-auto"
        >
          <RefreshCw className="h-3 w-3" />
          {t('retry')}
        </button>
      </div>
    );
  }

  if (dataSources.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        {t('noDataSourcesHint')}
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case 'analyzing':
        return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Database className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <>
      <SidebarMenu>
        {dataSources.map((source) => (
          <SidebarMenuItem key={source.id}>
            <div className="flex items-center w-full group/menu-item">
              <SidebarMenuButton
                isActive={activeDataSourceId === source.id}
                onClick={() => setActiveDataSource(source.id)}
                className="flex-1 min-w-0"
                tooltip={source.name}
              >
                {getStatusIcon(source.status)}
                <span className="truncate text-xs">{source.name}</span>
              </SidebarMenuButton>
              <button
                className="p-1 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 opacity-0 group-hover/menu-item:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoDataSourceId(source.id);
                  setInfoDialogOpen(true);
                }}
              >
                <Info className="h-3 w-3" />
              </button>
              {source.status === 'error' && (
                <button
                  className="p-1 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 opacity-0 group-hover/menu-item:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => handleRetryAnalyze(source.id, e)}
                  title="Retry analysis"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover/menu-item:opacity-100 transition-opacity shrink-0 mr-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteDataSource')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteDataSourceConfirm')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => handleDelete(source.id, e as unknown as React.MouseEvent)}>
                      {t('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      <DataSourceInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
        dataSourceId={infoDataSourceId}
      />
    </>
  );
}
