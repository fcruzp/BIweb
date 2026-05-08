'use client';

import { useWidgetData } from '@/hooks/use-widget-data';
import { ChartRenderer } from '@/components/app/visualization/chart-renderer';
import { DataTable } from '@/components/app/visualization/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import type { WidgetConfig } from '@/stores/dashboard-store';
import type { VisualizationConfig } from '@/stores/chat-store';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WidgetRendererProps {
  widget: WidgetConfig;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const { result, loading, error, refetch } = useWidgetData(
    widget.dataSourceId,
    widget.sqlQuery
  );

  // Text widgets — no data fetching needed
  if (widget.widgetType === 'text') {
    return <TextWidgetRenderer widget={widget} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-[160px] w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-xs text-destructive text-center">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7 mt-1"
          onClick={refetch}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  // No data source or query
  if (!widget.dataSourceId || !widget.sqlQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
        <Database className="h-6 w-6 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No data source configured</p>
      </div>
    );
  }

  // No results yet
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
        <p className="text-xs text-muted-foreground">No data</p>
      </div>
    );
  }

  // Parse visualization config
  let vizConfig: VisualizationConfig | null = null;
  if (widget.visualization) {
    try {
      const raw = typeof widget.visualization === 'string'
        ? JSON.parse(widget.visualization)
        : widget.visualization;
      vizConfig = raw as VisualizationConfig;
    } catch {
      vizConfig = null;
    }
  }

  // Render based on widget type
  switch (widget.widgetType) {
    case 'chart':
      if (vizConfig) {
        return <ChartRenderer visualization={vizConfig} data={result.data} />;
      }
      // Fallback: auto-render as bar chart
      return (
        <ChartRenderer
          visualization={{
            chartType: 'bar',
            title: widget.title,
            description: '',
            xAxis: result.columns[0],
            yAxis: result.columns.length > 1 ? [result.columns[1]] : [result.columns[0]],
          }}
          data={result.data}
        />
      );

    case 'table':
      return <DataTable data={result.data} columns={result.columns} />;

    case 'metric':
      if (vizConfig) {
        return <ChartRenderer visualization={vizConfig} data={result.data} />;
      }
      // Auto-generate metrics from first row
      return (
        <ChartRenderer
          visualization={{
            chartType: 'metric',
            title: widget.title,
            description: '',
          }}
          data={result.data}
        />
      );

    default:
      return <DataTable data={result.data} columns={result.columns} />;
  }
}

function TextWidgetRenderer({ widget }: { widget: WidgetConfig }) {
  // Parse config to get markdown content
  let markdownContent = '';
  try {
    const config = typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config;
    markdownContent = config?.markdown || config?.text || '';
  } catch {
    markdownContent = '';
  }

  if (!markdownContent) {
    return (
      <div className="flex items-center justify-center h-32 p-4">
        <p className="text-xs text-muted-foreground">No text content configured</p>
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none p-4 text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
    </div>
  );
}
