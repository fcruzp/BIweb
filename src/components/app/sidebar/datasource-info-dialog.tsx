'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Info,
  Database,
  Table2,
  Key,
  Link2,
  BookOpen,
  FileArchive,
  Hash,
  Sparkles,
  HardDrive,
} from 'lucide-react';

interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

interface SchemaInfo {
  id: string;
  tableName: string;
  columns: string;
  rowCount: number;
  sampleData: string;
}

interface ContextInfo {
  id: string;
  semanticContext: string;
  businessGlossary: string;
  relationships: string;
  summary: string;
}

interface DataSourceDetail {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  schemas: SchemaInfo[];
  contexts: ContextInfo[];
}

interface DataSourceInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSourceId: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/20">
          Ready
        </Badge>
      );
    case 'analyzing':
      return (
        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/25 hover:bg-amber-500/20">
          Analyzing
        </Badge>
      );
    case 'error':
      return (
        <Badge className="bg-red-500/15 text-red-500 border-red-500/25 hover:bg-red-500/20">
          Error
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 p-1">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function DataSourceInfoDialog({
  open,
  onOpenChange,
  dataSourceId,
}: DataSourceInfoDialogProps) {
  const [data, setData] = useState<DataSourceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !dataSourceId) {
      setData(null);
      setError(null);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/datasources/${dataSourceId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch data source details');
        }
        const json = await res.json();
        setData(json.datasource);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, dataSourceId]);

  const context = data?.contexts?.[0];
  let businessGlossary: Array<{ term: string; definition: string }> = [];
  let relationships: Array<{ from: string; to: string; type: string; description?: string }> = [];

  if (context) {
    try {
      const parsed = JSON.parse(context.businessGlossary || '{}');
      // Handle both object (Record<string, string>) and array formats
      if (Array.isArray(parsed)) {
        businessGlossary = parsed;
      } else if (typeof parsed === 'object') {
        businessGlossary = Object.entries(parsed).map(([term, definition]) => ({
          term,
          definition: String(definition),
        }));
      }
    } catch {
      businessGlossary = [];
    }
    try {
      const parsed = JSON.parse(context.relationships || '[]');
      if (Array.isArray(parsed)) {
        relationships = parsed;
      }
    } catch {
      relationships = [];
    }
  }

  // Total row count across all tables
  const totalRows = data?.schemas?.reduce((sum, s) => sum + s.rowCount, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Database className="h-4 w-4" />
            </div>
            {loading ? 'Loading...' : data?.name ?? 'Data Source Info'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Schema and context information for this data source.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-4 space-y-5">
            {loading && <LoadingSkeleton />}

            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400">
                <p className="font-medium">Failed to load data source</p>
                <p className="text-red-400/80 mt-1">{error}</p>
              </div>
            )}

            {!loading && !error && data && (
              <>
                {/* File Info Card */}
                <div className="flex items-center gap-3 rounded-lg bg-muted/40 border border-border/40 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{data.fileName}</span>
                      {getStatusBadge(data.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <FileArchive className="h-3 w-3" />
                        {formatFileSize(data.fileSize)}
                      </span>
                      <span className="uppercase tracking-wide">{data.fileType}</span>
                      {data.schemas && (
                        <>
                          <span>{data.schemas.length} tables</span>
                          <span>{totalRows.toLocaleString()} total rows</span>
                        </>
                      )}
                    </div>
                  </div>
                  {data.errorMessage && (
                    <div className="text-xs text-red-400 mt-1">{data.errorMessage}</div>
                  )}
                </div>

                {/* AI Summary - Compact card */}
                {context?.summary && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AI Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {context.summary}
                    </p>
                  </div>
                )}

                {/* Business Context - Only show if meaningfully different from summary */}
                {context?.semanticContext && context.semanticContext !== context?.summary && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Context</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                      {context.semanticContext}
                    </p>
                  </div>
                )}

                {/* Tables Section */}
                {data.schemas && data.schemas.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tables</span>
                      <Badge variant="outline" className="text-[10px] h-4 ml-1">
                        {data.schemas.length}
                      </Badge>
                    </div>
                    <Accordion type="multiple" className="w-full">
                      {data.schemas.map((schema) => {
                        let columns: ColumnInfo[] = [];
                        try {
                          columns = JSON.parse(schema.columns);
                        } catch {
                          columns = [];
                        }

                        return (
                          <AccordionItem key={schema.id} value={schema.tableName} className="border-border/40">
                            <AccordionTrigger className="hover:no-underline py-2 px-2 hover:bg-muted/30 rounded-md transition-colors">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Table2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="font-mono text-sm font-medium truncate">{schema.tableName}</span>
                                <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                                  {schema.rowCount.toLocaleString()} rows
                                </Badge>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {columns.length} cols
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-0.5 pl-5 pr-1">
                                {columns.map((col) => (
                                  <div
                                    key={col.name}
                                    className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/30"
                                  >
                                    {col.primaryKey ? (
                                      <Key className="h-3 w-3 text-amber-500 shrink-0" />
                                    ) : (
                                      <Hash className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                    )}
                                    <span className="font-mono text-xs min-w-0 truncate">{col.name}</span>
                                    <span className="text-[10px] text-muted-foreground/70 ml-auto shrink-0 uppercase">
                                      {col.type}
                                    </span>
                                    {col.primaryKey && (
                                      <Badge className="text-[9px] h-3.5 px-1 bg-amber-500/15 text-amber-500 border-amber-500/25">
                                        PK
                                      </Badge>
                                    )}
                                    {col.notNull && !col.primaryKey && (
                                      <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                                        NN
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                )}

                {/* Relationships Section */}
                {relationships.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relationships</span>
                      <Badge variant="outline" className="text-[10px] h-4 ml-1">
                        {relationships.length}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 pl-1">
                      {relationships.map((rel, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-md bg-muted/30 border border-border/30"
                        >
                          <span className="font-mono text-emerald-400 truncate">{rel.from}</span>
                          <span className="text-muted-foreground shrink-0">→</span>
                          <span className="font-mono text-emerald-400 truncate">{rel.to}</span>
                          {rel.type && (
                            <Badge variant="outline" className="text-[9px] h-3.5 ml-1 shrink-0">
                              {rel.type}
                            </Badge>
                          )}
                          {rel.description && (
                            <span className="text-muted-foreground ml-auto truncate max-w-[180px] shrink-0">
                              {rel.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business Glossary Section */}
                {businessGlossary.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Glossary</span>
                      <Badge variant="outline" className="text-[10px] h-4 ml-1">
                        {businessGlossary.length}
                      </Badge>
                    </div>
                    <div className="grid gap-1.5 pl-1">
                      {businessGlossary.map((item, idx) => (
                        <div
                          key={idx}
                          className="py-1.5 px-3 rounded-md bg-muted/30 border border-border/30"
                        >
                          <span className="text-xs font-medium text-emerald-400">{item.term}</span>
                          <span className="text-xs text-muted-foreground ml-2">{item.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {(!data.schemas || data.schemas.length === 0) &&
                  (!data.contexts || data.contexts.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No schema or context information available yet.
                    </div>
                  )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
