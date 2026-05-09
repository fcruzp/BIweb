'use client';

import type { ChatMessage } from '@/stores/chat-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Download,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { ReportMarkdown } from './report-markdown';
import { ChartRenderer } from '../visualization/chart-renderer';
import { DRHeatMap } from '../visualization/dr-map';
import { DataTable } from '../visualization/data-table';
import { useI18n } from '@/hooks/use-i18n';
import { exportAsCSV, exportAsJSON, exportAsHTML, generateExportFilename } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [sqlOpen, setSqlOpen] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const { t } = useI18n();

  const copyToClipboard = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const copySQL = () => {
    if (message.sqlQuery) {
      copyToClipboard(message.sqlQuery, setCopiedSQL);
    }
  };

  const copyContent = () => {
    // For assistant messages, copy as markdown
    // For user messages, copy as plain text
    copyToClipboard(message.content, setCopiedContent);
  };

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end group">
        <div className="flex items-end gap-1.5 max-w-[80%]">
          {/* Copy button for user message */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={copyContent}
                >
                  {copiedContent ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{copiedContent ? t('copied') : t('copyQuestion')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
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
        {/* Report content — styled card with copy button */}
        <div className="group relative rounded-xl bg-muted/20 border border-border/30 p-5 shadow-sm">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur-sm border border-border/30"
                    onClick={copyContent}
                  >
                    {copiedContent ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{copiedContent ? t('copied') : t('copyAsMarkdown')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <ReportMarkdown content={message.content} />
        </div>

        {/* Query metadata strip */}
        {message.queryResult && typeof message.queryResult.rowCount === 'number' && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2 py-1">
              <Database className="h-3 w-3 text-emerald-500/70" />
              <span className="font-medium">{message.queryResult.rowCount?.toLocaleString()}</span> {t('rows')}
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
                <span className="font-medium">{Math.round(message.confidence * 100)}%</span> {t('confidence')}
              </div>
            )}
            {isHeatmap && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2 py-1">
                <MapPin className="h-3 w-3" />
                {t('geographicMap')}
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
                {t('sqlQuery')}
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
                  {copiedSQL ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
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
                    title={t('drHeatMapTitle')}
                  />
                </div>
              ) : (
                <ChartRenderer
                  visualization={message.visualization}
                  data={message.queryResult.data}
                />
              )}

              <Separator className="my-3 bg-border/30" />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowTable(!showTable)}
                >
                  <Table2 className="h-3 w-3" />
                  {showTable ? t('hideRawData') : t('showRawData')}
                </Button>

                {/* Export dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3 w-3" />
                      {t('export')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => exportAsCSV(message.queryResult!.data, message.queryResult!.columns, generateExportFilename('datamind-query', 'csv'))}
                      className="gap-2 text-xs"
                    >
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportAsHTML(message.queryResult!.data, message.queryResult!.columns, generateExportFilename('datamind-query', 'xls'), message.visualization?.title)}
                      className="gap-2 text-xs"
                    >
                      Excel (.xls)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportAsJSON(message.queryResult!.data, generateExportFilename('datamind-query', 'json'))}
                      className="gap-2 text-xs"
                    >
                      JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
