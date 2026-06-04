/**
 * Data Export Utilities — CSV and XLSX export for query results
 *
 * Generates downloadable files from query result data arrays.
 * Used by the DataTable component and message-item export buttons.
 */

/**
 * Convert an array of objects to CSV string
 */
export function dataToCSV(
  data: Array<Record<string, unknown>>,
  columns?: string[]
): string {
  if (!data || data.length === 0) return '';

  const cols = columns || Object.keys(data[0]);

  // Header row
  const header = cols.map(escapeCSV).join(',');

  // Data rows
  const rows = data.map((row) =>
    cols.map((col) => escapeCSV(formatValue(row[col]))).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape a CSV cell value
 */
function escapeCSV(value: string): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline — wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format a value for export display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Trigger a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 */
export function exportAsCSV(
  data: Array<Record<string, unknown>>,
  columns: string[],
  filename?: string
): void {
  const csv = dataToCSV(data, columns);
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  downloadFile(BOM + csv, filename || 'data-export.csv', 'text/csv;charset=utf-8');
}

/**
 * Export data as JSON file
 */
export function exportAsJSON(
  data: Array<Record<string, unknown>>,
  filename?: string
): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename || 'data-export.json', 'application/json');
}

/**
 * Export data as a simple HTML table (can be opened in Excel)
 */
export function exportAsHTML(
  data: Array<Record<string, unknown>>,
  columns: string[],
  filename?: string,
  title?: string
): void {
  const cols = columns.length > 0 ? columns : (data.length > 0 ? Object.keys(data[0]) : []);

  const headerCells = cols.map(c => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;font-weight:600;text-align:left">${escapeHTML(c)}</th>`).join('');
  const rows = data.map(row =>
    '<tr>' + cols.map(c => `<td style="border:1px solid #ccc;padding:6px 10px">${escapeHTML(formatValue(row[c]))}</td>`).join('') + '</tr>'
  ).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHTML(title || 'DataMind Export')}</title></head>
<body><h2>${escapeHTML(title || 'DataMind Export')}</h2>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px">${headerCells}${rows}</table>
</body></html>`;

  downloadFile(html, filename || 'data-export.xls', 'application/vnd.ms-excel');
}

function escapeHTML(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate a timestamped filename
 */
export function generateExportFilename(prefix: string, extension: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  return `${prefix}_${dateStr}_${timeStr}.${extension}`;
}
