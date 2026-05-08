'use client';

import type { ChatMessage } from '@/stores/chat-store';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Brain,
  Code2,
  ChevronDown,
  Copy,
  Check,
  Clock,
  Table2,
  BarChart3,
  Database,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { ReportMarkdown } from './report-markdown';
import { ChartRenderer } from '../visualization/chart-renderer';
import { DRHeatMap } from '../visualization/dr-map';
import { DataTable } from '../visualization/data-table';
import { PinToDashboardButton } from './pin-to-dashboard-button';

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [sqlOpen, setSqlOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const activeDataSourceId = useAppStore((s) => s.activeDataSourceId);

  const copySQL = () => {
    if (message.sqlQuery) {
      navigator.clipboard.writeText(message.sqlQuery);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] bg-emerald-600/10 border border-emerald-600/20 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-medium">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  const isHeatmap = message.visualization?.chartType === 'heatmap';

  // Assistant message — report style
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
        <Brain className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 max-w-[90%]">
        {/* Report content — styled card */}
        <div className="rounded-xl bg-muted/20 border border-border/30 p-5 shadow-sm">
          <ReportMarkdown content={message.content} />
        </div>

        {/* Query metadata strip */}
        {message.queryResult && typeof message.queryResult.rowCount === 'number' && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2 py-1">
              <Database className="h-3 w-3 text-emerald-500/70" />
              <span className="font-medium">{message.queryResult.rowCount?.toLocaleString()}</span> rows
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2 py-1">
              <Clock className="h-3 w-3 text-emerald-500/70" />
              <span className="font-medium">{message.queryResult.executionTime}</span>ms
            </div>
            {message.confidence !== undefined && (
              <div className={`flex items-center gap-1.5 text-[11px] rounded-md px-2 py-1 ${
                message.confidence > 0.7
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : message.confidence > 0.4
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                    : 'text-red-600 dark:text-red-400 bg-red-500/10'
              }`}>
                <ShieldCheck className="h-3 w-3" />
                <span className="font-medium">{Math.round(message.confidence * 100)}%</span> confidence
              </div>
            )}
            {isHeatmap && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-1">
                <MapPin className="h-3 w-3" />
                Mapa geográfico
              </div>
            )}
          </div>
        )}

        {/* SQL Code Block — collapsible */}
        {message.sqlQuery && (
          <Collapsible open={sqlOpen} onOpenChange={setSqlOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-[11px] h-7 border-border/50 text-muted-foreground hover:text-foreground"
              >
                <Code2 className="h-3 w-3" />
                SQL Query
                <ChevronDown className={`h-3 w-3 transition-transform ${sqlOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 relative group">
                <pre className="bg-muted/30 border border-border/40 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                  <code className="text-foreground/70">{message.sqlQuery}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={copySQL}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Visualization card */}
        {message.visualization && message.queryResult && (
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-4 bg-muted/20 border-b border-border/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                {message.visualization.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-3">
              {/* For heatmap: show both a bar chart AND the map, stacked vertically */}
              {isHeatmap ? (
                <div className="space-y-4">
                  {/* Standard chart (bar chart) — use province/value columns for axes */}
                  <ChartRenderer
                    visualization={{
                      ...message.visualization,
                      chartType: 'bar',
                      xAxis: message.visualization.provinceColumn || message.visualization.xAxis,
                      yAxis: message.visualization.valueColumn
                        ? [message.visualization.valueColumn]
                        : message.visualization.yAxis,
                    }}
                    data={message.queryResult.data}
                  />

                  <Separator className="bg-border/30" />

                  {/* DR Heat Map */}
                  <DRHeatMap
                    data={message.queryResult.data}
                    provinceColumn={message.visualization.provinceColumn || ''}
                    valueColumn={message.visualization.valueColumn || ''}
                    title="Mapa de Calor — República Dominicana"
                  />
                </div>
              ) : (
                <ChartRenderer
                  visualization={message.visualization}
                  data={message.queryResult.data}
                />
              )}

              <Separator className="my-3 bg-border/30" />
              <div className="flex items-center gap-1 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowTable(!showTable)}
                >
                  <Table2 className="h-3 w-3" />
                  {showTable ? 'Hide Raw Data' : 'Show Raw Data'}
                </Button>
                {message.sqlQuery && (
                  <PinToDashboardButton
                    title={message.visualization.title || 'Pinned Chart'}
                    widgetType={message.visualization.chartType === 'metric' ? 'metric' : 'chart'}
                    dataSourceId={activeDataSourceId || ''}
                    sqlQuery={message.sqlQuery}
                    visualization={message.visualization}
                  />
                )}
              </div>
              {showTable && (
                <div className="mt-2">
                  <DataTable data={message.queryResult.data} columns={message.queryResult.columns} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* If no visualization but has data, show table */}
        {message.queryResult?.data && !message.visualization && (
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4">
              <DataTable data={message.queryResult.data} columns={message.queryResult.columns || []} />
              {message.sqlQuery && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <PinToDashboardButton
                    title="Pinned Table"
                    widgetType="table"
                    dataSourceId={activeDataSourceId || ''}
                    sqlQuery={message.sqlQuery}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
