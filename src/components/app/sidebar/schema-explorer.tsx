'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Table2, Key, Loader2, Database, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';

interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

interface TableSchemaInfo {
  id: string;
  tableName: string;
  columns: string;
  rowCount: number;
  sampleData: string;
}

interface TableDataResponse {
  data: Array<Record<string, unknown>>;
  columns: string[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') {
    return value.length > 200 ? value.substring(0, 200) + '\u2026' : value;
  }
  const str = String(value);
  return str.length > 200 ? str.substring(0, 200) + '\u2026' : str;
}

function cellValueClass(value: unknown): string {
  if (value === null || value === undefined) return 'text-muted-foreground/60 italic';
  if (typeof value === 'number') return 'text-emerald-400';
  if (typeof value === 'boolean') return 'text-amber-400';
  return 'text-foreground';
}

function TableDataPreview({
  dataSourceId,
  tableName,
}: {
  dataSourceId: string;
  tableName: string;
}) {
  const [data, setData] = useState<TableDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useI18n();

  const fetchData = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          dataSourceId,
          tableName,
          page: String(page),
          pageSize: '10',
        });
        const res = await fetch(`/api/schema/table-data?${params}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || 'Failed to fetch table data');
        }
        const result: TableDataResponse = await res.json();
        setData(result);
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [dataSourceId, tableName]
  );

  // Auto-load page 1 on mount
  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handlePrev = () => {
    if (data && currentPage > 1) {
      fetchData(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (data && currentPage < data.totalPages) {
      fetchData(currentPage + 1);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        <span className="ml-2 text-sm text-muted-foreground">{t('loadingData')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => fetchData(1)}
        >
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        {t('noDataInTable')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {data.columns.map((col) => (
                <TableHead
                  key={col}
                  className="text-xs font-semibold text-muted-foreground bg-muted/30 whitespace-nowrap"
                >
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {data.columns.map((col) => {
                  const val = row[col];
                  return (
                    <TableCell key={col} className="text-xs font-mono whitespace-nowrap max-w-[200px]">
                      <span className={cellValueClass(val)}>
                        {formatCellValue(val)}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {t('rowsTotal', { count: String(data.totalRows) })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrev}
            disabled={currentPage <= 1 || loading}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[80px] text-center">
            {t('pageOf', { current: String(currentPage), total: String(data.totalPages) })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handleNext}
            disabled={currentPage >= data.totalPages || loading}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
        </div>
      )}
    </div>
  );
}

export function SchemaExplorer() {
  const { activeDataSourceId, dataSources } = useAppStore();
  const [schemas, setSchemas] = useState<TableSchemaInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<string>('');
  const { t } = useI18n();

  const activeSource = dataSources.find((s) => s.id === activeDataSourceId);

  useEffect(() => {
    if (!activeDataSourceId) {
      setSchemas([]);
      setContext('');
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadSchema() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/datasources/${activeDataSourceId}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setSchemas(data.datasource?.schemas || []);
          setContext(data.datasource?.contexts?.[0]?.summary || '');
        } else {
          setError(`Failed to load schema (${res.status})`);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Network error');
        console.error('Failed to load schema:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSchema();
    return () => { cancelled = true; };
  }, [activeDataSourceId]);

  if (!activeSource) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">{t('noDataSourceSelected')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('noDataSourceExplore')}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">{t('failedToLoadSchema')}</h3>
        <p className="text-sm text-destructive mt-1">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            setError(null);
            // Re-trigger the effect by toggling activeDataSourceId
            const currentId = activeDataSourceId;
            if (currentId) {
              // Force re-render by briefly setting to null then back
              window.dispatchEvent(new CustomEvent('retry-schema-load'));
            }
          }}
        >
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold">{activeSource.name}</h2>
          {context && (
            <p className="text-sm text-muted-foreground mt-1">{context}</p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Table2 className="h-3 w-3" />
            {schemas.length} {t('tables').toLowerCase()}
          </Badge>
          <Badge variant="secondary">
            {activeSource.fileName}
          </Badge>
        </div>

        <Accordion type="multiple" className="w-full">
          {schemas.map((schema) => {
            let columns: ColumnInfo[] = [];
            try {
              columns = JSON.parse(schema.columns);
            } catch { /* ignore parse errors */ }

            return (
              <AccordionItem key={schema.id} value={schema.tableName}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{schema.tableName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {schema.rowCount} {t('rows')}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Tabs defaultValue="columns" className="w-full">
                    <TabsList className="h-7">
                      <TabsTrigger value="columns" className="text-xs px-2.5 h-5">
                        {t('columns')}
                      </TabsTrigger>
                      <TabsTrigger value="data" className="text-xs px-2.5 h-5">
                        {t('data')}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="columns" className="mt-3">
                      <div className="space-y-1 pl-2">
                        {columns.map((col) => (
                          <div
                            key={col.name}
                            className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50"
                          >
                            {col.primaryKey ? (
                              <Key className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Hash className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="font-mono text-xs">{col.name}</span>
                            <Badge variant="outline" className="text-[10px] ml-auto">
                              {col.type}
                            </Badge>
                            {col.notNull && (
                              <Badge variant="secondary" className="text-[10px]">
                                {t('notNull')}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="data" className="mt-3">
                      {activeDataSourceId ? (
                        <TableDataPreview
                          dataSourceId={activeDataSourceId}
                          tableName={schema.tableName}
                        />
                      ) : (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          {t('noDataSourceSelected2')}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </ScrollArea>
  );
}
