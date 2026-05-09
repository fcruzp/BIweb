'use client';

import { useWidgetData } from '@/hooks/use-widget-data';
import { ChartRenderer } from '@/components/app/visualization/chart-renderer';
import { DataTable } from '@/components/app/visualization/data-table';
import { DRHeatMap } from '@/components/app/visualization/dr-map';
import { Skeleton } from '@/components/ui/skeleton';
import type { WidgetConfig } from '@/stores/dashboard-store';
import type { VisualizationConfig } from '@/stores/chat-store';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/hooks/use-i18n';

interface WidgetRendererProps {
  widget: WidgetConfig;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const { result, loading, error, refetch } = useWidgetData(
    widget.dataSourceId,
    widget.sqlQuery
  );
  const { t } = useI18n();

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
          {t('retry')}
        </Button>
      </div>
    );
  }

  // No data source or query
  if (!widget.dataSourceId || !widget.sqlQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
        <Database className="h-6 w-6 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">{t('noDataConfigured')}</p>
      </div>
    );
  }

  // No results yet
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
        <p className="text-xs text-muted-foreground">{t('noData')}</p>
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

    case 'map':
      if (vizConfig && vizConfig.chartType === 'heatmap') {
        return (
          <div className="space-y-3">
            {/* Bar chart above the map */}
            <ChartRenderer
              visualization={{
                ...vizConfig,
                chartType: 'bar',
                xAxis: vizConfig.provinceColumn || vizConfig.xAxis,
                yAxis: vizConfig.valueColumn ? [vizConfig.valueColumn] : vizConfig.yAxis,
              }}
              data={result.data}
            />
            <DRHeatMap
              data={result.data}
              provinceColumn={vizConfig.provinceColumn || ''}
              valueColumn={vizConfig.valueColumn || ''}
              title={vizConfig.title}
            />
          </div>
        );
      }
      // Fallback: if no heatmap vizConfig, render as chart
      return <ChartRenderer visualization={vizConfig || {
        chartType: 'bar',
        title: widget.title,
        description: '',
        xAxis: result.columns[0],
        yAxis: result.columns.length > 1 ? [result.columns[1]] : [result.columns[0]],
      }} data={result.data} />;

    default:
      return <DataTable data={result.data} columns={result.columns} />;
  }
}

function TextWidgetRenderer({ widget }: { widget: WidgetConfig }) {
  const { t } = useI18n();

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
        <p className="text-xs text-muted-foreground">{t('noTextContent')}</p>
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none p-4 text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
    </div>
  );
}
