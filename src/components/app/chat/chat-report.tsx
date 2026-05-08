'use client';

import { useChatStore } from '@/stores/chat-store';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { X, Printer, FileText } from 'lucide-react';
import { ReportMarkdown } from './report-markdown';
import { ChartRenderer } from '../visualization/chart-renderer';
import { DataTable } from '../visualization/data-table';
import { DRHeatMap } from '../visualization/dr-map';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/hooks/use-i18n';

interface ChatReportProps {
  onClose: () => void;
}

export function ChatReport({ onClose }: ChatReportProps) {
  const { messages } = useChatStore();
  const { chatSessions, activeSessionId, activeDataSourceId, dataSources } = useAppStore();
  const { t } = useI18n();

  const activeChat = chatSessions.find(s => s.id === activeSessionId);
  const activeSource = dataSources.find(s => s.id === activeDataSourceId);
  const reportTitle = activeChat?.title || activeSource?.name || t('chatReport');
  const generatedAt = new Date().toLocaleString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Non-printable toolbar */}
      <div className="print:hidden border-b border-border/50 px-6 py-3 flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-emerald-500" />
          <div>
            <h2 className="text-sm font-semibold">{t('reportColon')} {reportTitle}</h2>
            <p className="text-[10px] text-muted-foreground">{t('printOrSavePdf')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 gap-2" size="sm">
            <Printer className="h-4 w-4" />
            {t('printSavePdf')}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            {t('close')}
          </Button>
        </div>
      </div>

      {/* Printable report content */}
      <div className="overflow-y-auto h-[calc(100vh-56px)] print:h-auto print:overflow-visible">
        <div className="max-w-[850px] mx-auto px-8 py-8 print:px-0 print:py-0 print:max-w-none">
          {/* Report Header */}
          <div className="mb-8 print:mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg print:bg-emerald-700">
                D
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{reportTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  DataMind BI — {activeSource?.name || t('dataSource')} · {generatedAt}
                </p>
              </div>
            </div>
            <Separator className="bg-border/50" />
          </div>

          {/* Messages */}
          <div className="space-y-6 print:space-y-4">
            {messages.map((msg, idx) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id || idx} className="report-message print:break-inside-avoid">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-medium print:bg-emerald-700">
                        Q
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{t('question')}</p>
                        <p className="text-sm whitespace-pre-wrap text-foreground">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Assistant message
              const isHeatmap = msg.visualization?.chartType === 'heatmap';
              return (
                <div key={msg.id || idx} className="report-message print:break-inside-avoid">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 print:bg-emerald-100 print:text-emerald-700">
                      <span className="text-xs font-bold">AI</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Report content */}
                      {msg.content && (
                        <div className="rounded-lg border border-border/30 bg-muted/10 p-4 print:border-gray-200 print:bg-gray-50">
                          <ReportMarkdown content={msg.content} />
                        </div>
                      )}

                      {/* SQL Query */}
                      {msg.sqlQuery && (
                        <div className="rounded-lg border border-border/30 bg-muted/5 p-3 print:border-gray-200 print:bg-gray-50">
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">{t('sqlQuery')}</p>
                          <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">
                            <code>{msg.sqlQuery}</code>
                          </pre>
                        </div>
                      )}

                      {/* Visualization */}
                      {msg.visualization && msg.queryResult?.data && Array.isArray(msg.queryResult.data) && (
                        <div className="rounded-lg border border-border/30 print:border-gray-200">
                          <div className="px-4 py-2 border-b border-border/20 bg-muted/10 print:bg-gray-50 print:border-gray-200">
                            <p className="text-xs font-semibold text-foreground">
                              {msg.visualization.title || t('visualization')}
                            </p>
                          </div>
                          <div className="p-4">
                            {isHeatmap ? (
                              <div className="space-y-4">
                                <ChartRenderer
                                  visualization={{
                                    ...msg.visualization,
                                    chartType: 'bar',
                                    xAxis: msg.visualization.provinceColumn || msg.visualization.xAxis,
                                    yAxis: msg.visualization.valueColumn
                                      ? [msg.visualization.valueColumn]
                                      : msg.visualization.yAxis,
                                  }}
                                  data={msg.queryResult.data}
                                />
                                <DRHeatMap
                                  data={msg.queryResult.data}
                                  provinceColumn={msg.visualization.provinceColumn || ''}
                                  valueColumn={msg.visualization.valueColumn || ''}
                                  title={t('drHeatMapTitle')}
                                />
                              </div>
                            ) : (
                              <ChartRenderer
                                visualization={msg.visualization}
                                data={msg.queryResult.data}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Data Table (compact) */}
                      {msg.queryResult?.data && Array.isArray(msg.queryResult.data) && msg.queryResult.data.length > 0 && msg.queryResult.columns && (
                        <div className="rounded-lg border border-border/30 overflow-hidden print:border-gray-200">
                          <div className="px-4 py-2 border-b border-border/20 bg-muted/10 print:bg-gray-50 print:border-gray-200">
                            <p className="text-xs font-semibold text-foreground">
                              {t('dataRows', { count: String(msg.queryResult.data.length) })}
                            </p>
                          </div>
                          <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/30 bg-muted/20 print:bg-gray-100 print:border-gray-200">
                                  {msg.queryResult.columns.map((col: string) => (
                                    <th key={col} className="px-3 py-1.5 text-left font-semibold text-foreground/80 whitespace-nowrap">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {msg.queryResult.data.slice(0, 20).map((row: Record<string, unknown>, rIdx: number) => (
                                  <tr key={rIdx} className="border-b border-border/10 print:border-gray-100">
                                    {msg.queryResult.columns.map((col: string) => (
                                      <td key={col} className="px-3 py-1.5 text-foreground/70 whitespace-nowrap">
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '\u2014'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {msg.queryResult.data.length > 20 && (
                              <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-t border-border/10 print:border-gray-200">
                                {t('showingRows', { count: '20', total: String(msg.queryResult.data.length) })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Report Footer */}
          <div className="mt-10 pt-4 border-t border-border/30 print:border-gray-200 print:mt-6">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{t('generatedByDataMind')}</span>
              <span>{generatedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
