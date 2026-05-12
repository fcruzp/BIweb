'use client';

import { useChatStore } from '@/stores/chat-store';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { X, Printer, FileText } from 'lucide-react';
import { ReportMarkdown } from './report-markdown';
import { ChartRenderer } from '../visualization/chart-renderer';
import { DRHeatMap } from '../visualization/dr-map';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/hooks/use-i18n';
import { type TranslationFn } from '@/lib/i18n';
import { useCallback, useRef } from 'react';

interface ChatReportProps {
  onClose: () => void;
}

export function ChatReport({ onClose }: ChatReportProps) {
  const { messages } = useChatStore();
  const { chatSessions, activeSessionId, activeDataSourceId, dataSources } = useAppStore();
  const { t } = useI18n();
  const reportRef = useRef<HTMLDivElement>(null);

  const activeChat = chatSessions.find(s => s.id === activeSessionId);
  const activeSource = dataSources.find(s => s.id === activeDataSourceId);
  const reportTitle = activeChat?.title || activeSource?.name || t('chatReport');
  const generatedAt = new Date().toLocaleString();

  const handlePrint = useCallback(() => {
    if (!reportRef.current) return;

    // Clone the report content
    const reportContent = reportRef.current.cloneNode(true) as HTMLElement;

    // Build a complete HTML document for printing
    const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} — DataMind BI Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      margin: 1.5cm;
      size: A4;
    }
    .report-container {
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
    }

    /* Header */
    .report-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    .report-header-inner {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .report-logo {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: #059669;
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; font-size: 18px;
    }
    .report-header h1 { font-size: 20pt; font-weight: 700; color: #111; }
    .report-header .subtitle { font-size: 10pt; color: #6b7280; margin-top: 2px; }

    /* Messages */
    .report-messages { display: flex; flex-direction: column; gap: 20px; }

    /* User message */
    .msg-user {
      display: flex; align-items: flex-start; gap: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .msg-avatar-q {
      width: 28px; height: 28px; border-radius: 50%;
      background: #059669; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; flex-shrink: 0;
    }
    .msg-user-content { flex: 1; }
    .msg-user-label { font-size: 9pt; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
    .msg-user-text { font-size: 10.5pt; white-space: pre-wrap; color: #111; }

    /* Assistant message */
    .msg-assistant {
      display: flex; align-items: flex-start; gap: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .msg-avatar-ai {
      width: 28px; height: 28px; border-radius: 8px;
      background: #d1fae5; color: #059669;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700; flex-shrink: 0;
    }
    .msg-assistant-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }

    /* Content card */
    .msg-content-card {
      border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 14px; background: #f9fafb;
      font-size: 10pt; line-height: 1.6;
      break-inside: avoid;
    }
    .msg-content-card h1 { font-size: 14pt; font-weight: 700; color: #111; margin: 12px 0 6px; }
    .msg-content-card h2 { font-size: 12pt; font-weight: 600; color: #111; margin: 10px 0 4px; }
    .msg-content-card h3 { font-size: 11pt; font-weight: 600; color: #111; margin: 8px 0 4px; }
    .msg-content-card p { margin: 4px 0; }
    .msg-content-card ul, .msg-content-card ol { margin: 4px 0; padding-left: 20px; }
    .msg-content-card li { margin: 2px 0; }
    .msg-content-card strong { font-weight: 600; }
    .msg-content-card blockquote {
      border-left: 3px solid #059669; padding: 8px 12px; margin: 8px 0;
      background: #ecfdf5; border-radius: 4px;
    }
    .msg-content-card code {
      background: #f3f4f6; padding: 1px 4px; border-radius: 3px;
      font-family: 'SF Mono', Monaco, monospace; font-size: 9pt;
    }
    .msg-content-card pre {
      background: #f3f4f6; padding: 10px; border-radius: 6px;
      overflow-x: auto; font-size: 9pt;
    }
    .msg-content-card hr { border: none; border-top: 1px solid #e5e7eb; margin: 10px 0; }

    /* Visualization card */
    .viz-card {
      border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
      break-inside: avoid;
    }
    .viz-card-header {
      padding: 8px 14px; border-bottom: 1px solid #e5e7eb;
      background: #f9fafb; font-size: 9pt; font-weight: 600;
    }
    .viz-card-body { padding: 14px; }

    /* Data table */
    .data-table-card {
      border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
      break-inside: avoid;
    }
    .data-table-header {
      padding: 8px 14px; border-bottom: 1px solid #e5e7eb;
      background: #f9fafb; font-size: 9pt; font-weight: 600;
    }
    .data-table-body { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; font-size: 9pt; }
    th { border: 1px solid #e5e7eb; padding: 5px 10px; background: #f3f4f6; font-weight: 600; text-align: left; white-space: nowrap; }
    td { border: 1px solid #e5e7eb; padding: 5px 10px; white-space: nowrap; }
    tr:nth-child(even) td { background: #f9fafb; }
    .table-footer { font-size: 8pt; color: #6b7280; padding: 6px 10px; border-top: 1px solid #e5e7eb; }

    /* SVG maps and charts */
    svg { max-width: 100% !important; height: auto !important; }

    /* Footer */
    .report-footer {
      margin-top: 36px; padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex; justify-content: space-between;
      font-size: 8pt; color: #6b7280;
    }

    /* Separator between Q&A pairs */
    .qa-separator {
      border: none;
      border-top: 1px dashed #d1d5db;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="report-container">
    ${buildPrintReport(messages.map(m => ({ ...m, sqlQuery: m.sqlQuery || undefined, visualization: m.visualization || undefined } as any)), reportTitle, activeSource?.name || t('dataSource'), generatedAt, t)}
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      // Fallback to regular print if popup blocked
      window.print();
      return;
    }

    printWindow.document.write(printHtml);
    printWindow.document.close();

    // Wait for content to render, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Don't auto-close — let user save PDF first
      }, 500);
    };
  }, [messages, reportTitle, activeSource, generatedAt, t]);

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
      <div ref={reportRef} className="overflow-y-auto h-[calc(100vh-56px)] print:h-auto print:overflow-visible print:static print:absolute print:inset-0">
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
                                    {msg.queryResult?.columns?.map((col: string) => (
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

                  {/* Separator between Q&A pairs */}
                  {idx < messages.length - 1 && (
                    <Separator className="mt-6 bg-border/20 print:bg-gray-200" />
                  )}
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

/**
 * Build a pure HTML string for the print window.
 * This avoids React rendering issues in popup windows and ensures
 * all messages are visible in the print output.
 */
function buildPrintReport(
  messages: Array<{ id?: string; role: string; content: string; sqlQuery?: string; visualization?: Record<string, unknown>; queryResult?: { data?: unknown[]; columns?: string[]; rowCount?: number; executionTime?: number } }>,
  reportTitle: string,
  dataSourceName: string,
  generatedAt: string,
  t: TranslationFn
): string {
  let html = '';

  // Header
  html += `
    <div class="report-header">
      <div class="report-header-inner">
        <div class="report-logo">D</div>
        <div>
          <h1>${escapeHtml(reportTitle)}</h1>
          <div class="subtitle">DataMind BI — ${escapeHtml(dataSourceName)} · ${escapeHtml(generatedAt)}</div>
        </div>
      </div>
    </div>
  `;

  // Messages
  html += '<div class="report-messages">';

  messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      html += `
        <div class="msg-user">
          <div class="msg-avatar-q">Q</div>
          <div class="msg-user-content">
            <div class="msg-user-label">${t('question')}</div>
            <div class="msg-user-text">${escapeHtml(msg.content)}</div>
          </div>
        </div>
      `;
    } else {
      // Assistant message
      html += '<div class="msg-assistant">';
      html += '<div class="msg-avatar-ai">AI</div>';
      html += '<div class="msg-assistant-body">';

      // Content
      if (msg.content) {
        html += `
          <div class="msg-content-card">
            ${renderMarkdownToSimpleHtml(msg.content)}
          </div>
        `;
      }

      // Visualization — indicate chart type
      if (msg.visualization) {
        const vizTitle = (msg.visualization.title as string) || t('visualization');
        const chartType = msg.visualization.chartType as string;
        const chartLabel = chartType === 'heatmap' ? '🗺️ ' + vizTitle : '📊 ' + vizTitle;
        html += `
          <div class="viz-card">
            <div class="viz-card-header">${escapeHtml(chartLabel)}</div>
            <div class="viz-card-body" style="color: #6b7280; font-size: 9pt; font-style: italic;">
              ${chartType === 'heatmap' ? 'Geographic heat map visualization (interactive in app)' : 'Chart visualization (interactive in app)'}
            </div>
          </div>
        `;
      }

      // Data table
      const data = msg.queryResult?.data;
      const columns = msg.queryResult?.columns;
      if (Array.isArray(data) && data.length > 0 && columns && columns.length > 0) {
        html += `
          <div class="data-table-card">
            <div class="data-table-header">${t('dataRows').replace('{count}', String(data.length))}</div>
            <div class="data-table-body">
              <table>
                <thead><tr>
                  ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                </tr></thead>
                <tbody>
                  ${(data as Record<string, unknown>[]).slice(0, 30).map(row =>
                    '<tr>' + columns.map(col =>
                      `<td>${row[col] !== null && row[col] !== undefined ? escapeHtml(String(row[col])) : '—'}</td>`
                    ).join('') + '</tr>'
                  ).join('')}
                </tbody>
              </table>
              ${data.length > 30 ? `<div class="table-footer">${t('showingRows').replace('{count}', '30').replace('{total}', String(data.length))}</div>` : ''}
            </div>
          </div>
        `;
      }

      html += '</div>'; // msg-assistant-body
      html += '</div>'; // msg-assistant

      // Separator between Q&A pairs
      if (idx < messages.length - 1) {
        html += '<hr class="qa-separator">';
      }
    }
  });

  html += '</div>'; // report-messages

  // Footer
  html += `
    <div class="report-footer">
      <span>${t('generatedByDataMind')}</span>
      <span>${escapeHtml(generatedAt)}</span>
    </div>
  `;

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert markdown to simple HTML for print output.
 * Processes line by line to handle headings, lists, blockquotes, bold, italic, and horizontal rules.
 */
function renderMarkdownToSimpleHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inList = false;
  let inBlockquote = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Close blockquote if not continuing
    if (inBlockquote && !trimmed.startsWith('>')) {
      htmlParts.push('</blockquote>');
      inBlockquote = false;
    }

    // Close list if not continuing
    if (inList && !trimmed.startsWith('- ') && !/^\d+\.\s/.test(trimmed) && trimmed !== '') {
      htmlParts.push('</ul>');
      inList = false;
    }

    // Empty line
    if (trimmed === '') {
      htmlParts.push('<br>');
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      htmlParts.push(`<h3>${processInlineMarkdown(escapeHtml(trimmed.slice(4)))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      htmlParts.push(`<h2>${processInlineMarkdown(escapeHtml(trimmed.slice(3)))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      htmlParts.push(`<h1>${processInlineMarkdown(escapeHtml(trimmed.slice(2)))}</h1>`);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      htmlParts.push('<hr>');
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      if (!inBlockquote) {
        htmlParts.push('<blockquote>');
        inBlockquote = true;
      }
      htmlParts.push(processInlineMarkdown(escapeHtml(trimmed.slice(2))));
      htmlParts.push('<br>');
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      htmlParts.push(`<li>${processInlineMarkdown(escapeHtml(trimmed.slice(2)))}</li>`);
      continue;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^(\d+)\.\s(.+)$/);
    if (numberedMatch) {
      if (!inList) {
        htmlParts.push('<ol>');
        inList = true;
      }
      htmlParts.push(`<li>${processInlineMarkdown(escapeHtml(numberedMatch[2]))}</li>`);
      continue;
    }

    // Regular paragraph
    htmlParts.push(`<p>${processInlineMarkdown(escapeHtml(trimmed))}</p>`);
  }

  // Close any open blocks
  if (inBlockquote) htmlParts.push('</blockquote>');
  if (inList) htmlParts.push('</ul>');

  return htmlParts.join('\n');
}

/**
 * Process inline markdown: bold, italic, code
 */
function processInlineMarkup(text: string): string {
  // Bold
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  result = result.replace(/`(.+?)`/g, '<code>$1</code>');
  return result;
}

// Alias for clarity
const processInlineMarkdown = processInlineMarkup;
