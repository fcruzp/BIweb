'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Database, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
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

export function DataSourceList() {
  const {
    dataSources,
    dataSourcesLoading,
    setDataSources,
    setDataSourcesLoading,
    activeDataSourceId,
    setActiveDataSource,
    removeDataSource,
  } = useAppStore();

  useEffect(() => {
    async function loadDataSources() {
      setDataSourcesLoading(true);
      try {
        const res = await fetch('/api/datasources');
        if (res.ok) {
          const data = await res.json();
          setDataSources(data.datasources);
        }
      } catch (error) {
        console.error('Failed to load data sources:', error);
      } finally {
        setDataSourcesLoading(false);
      }
    }
    loadDataSources();
  }, [setDataSources, setDataSourcesLoading]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/datasources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        removeDataSource(id);
        if (activeDataSourceId === id) {
          setActiveDataSource(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete data source:', error);
    }
  };

  if (dataSourcesLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dataSources.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        No data sources yet. Upload a SQLite file to get started.
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
                  <AlertDialogTitle>Delete Data Source</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{source.name}&quot;? This will also delete all associated schemas, contexts, and query history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => handleDelete(source.id, e as unknown as React.MouseEvent)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
