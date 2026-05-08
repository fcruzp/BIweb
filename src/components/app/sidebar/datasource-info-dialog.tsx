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
  FileDatabase,
  Hash,
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
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
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
      businessGlossary = JSON.parse(context.businessGlossary || '[]');
    } catch {
      businessGlossary = [];
    }
    try {
      relationships = JSON.parse(context.relationships || '[]');
    } catch {
      relationships = [];
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-emerald-500" />
            {loading ? 'Loading...' : data?.name ?? 'Data Source Info'}
          </DialogTitle>
          <DialogDescription>
            Detailed schema and context information for this data source.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[80vh]">
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
                {/* Header Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{data.name}</h3>
                    {getStatusBadge(data.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <FileDatabase className="h-3.5 w-3.5" />
                      {data.fileName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      {formatFileSize(data.fileSize)}
                    </span>
                    <span className="uppercase text-xs tracking-wide">{data.fileType}</span>
                  </div>
                  {data.errorMessage && (
                    <div className="text-sm text-red-400 mt-1">
                      Error: {data.errorMessage}
                    </div>
                  )}
                </div>

                {/* Summary Section */}
                {context?.summary && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-400">
                        <BookOpen className="h-4 w-4" />
                        AI Summary
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {context.summary}
                      </p>
                    </div>
                  </>
                )}

                {/* Business Context */}
                {context?.semanticContext && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-400">
                        <BookOpen className="h-4 w-4" />
                        Business Context
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {context.semanticContext}
                      </p>
                    </div>
                  </>
                )}

                {/* Tables Section */}
                {data.schemas && data.schemas.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-400">
                        <Table2 className="h-4 w-4" />
                        Tables
                        <Badge variant="outline" className="text-[10px] ml-1">
                          {data.schemas.length}
                        </Badge>
                      </h4>
                      <Accordion type="multiple" className="w-full">
                        {data.schemas.map((schema) => {
                          let columns: ColumnInfo[] = [];
                          try {
                            columns = JSON.parse(schema.columns);
                          } catch {
                            columns = [];
                          }

                          return (
                            <AccordionItem key={schema.id} value={schema.tableName}>
                              <AccordionTrigger className="hover:no-underline py-2">
                                <div className="flex items-center gap-2">
                                  <Table2 className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className="font-medium text-sm">{schema.tableName}</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {schema.rowCount} rows
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-1 pl-6">
                                  {columns.map((col) => (
                                    <div
                                      key={col.name}
                                      className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50"
                                    >
                                      {col.primaryKey ? (
                                        <Key className="h-3 w-3 text-amber-500 shrink-0" />
                                      ) : (
                                        <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                                      )}
                                      <span className="font-mono text-xs">{col.name}</span>
                                      <Badge variant="outline" className="text-[10px] ml-auto">
                                        {col.type}
                                      </Badge>
                                      {col.primaryKey && (
                                        <Badge className="text-[10px] bg-amber-500/15 text-amber-500 border-amber-500/25">
                                          PK
                                        </Badge>
                                      )}
                                      {col.notNull && (
                                        <Badge variant="secondary" className="text-[10px]">
                                          NOT NULL
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
                  </>
                )}

                {/* Relationships Section */}
                {relationships.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-400">
                        <Link2 className="h-4 w-4" />
                        Relationships
                        <Badge variant="outline" className="text-[10px] ml-1">
                          {relationships.length}
                        </Badge>
                      </h4>
                      <div className="space-y-2">
                        {relationships.map((rel, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-md bg-muted/30 border border-border/50"
                          >
                            <Link2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="font-mono text-xs text-emerald-300">{rel.from}</span>
                            <span className="text-muted-foreground text-xs">→</span>
                            <span className="font-mono text-xs text-emerald-300">{rel.to}</span>
                            {rel.type && (
                              <Badge variant="outline" className="text-[10px] ml-1">
                                {rel.type}
                              </Badge>
                            )}
                            {rel.description && (
                              <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]">
                                {rel.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Business Glossary Section */}
                {businessGlossary.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-400">
                        <BookOpen className="h-4 w-4" />
                        Business Glossary
                        <Badge variant="outline" className="text-[10px] ml-1">
                          {businessGlossary.length}
                        </Badge>
                      </h4>
                      <div className="space-y-2">
                        {businessGlossary.map((item, idx) => (
                          <div
                            key={idx}
                            className="py-2 px-3 rounded-md bg-muted/30 border border-border/50"
                          >
                            <div className="text-sm font-medium text-emerald-300">
                              {item.term}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.definition}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Empty state when no schemas/contexts */}
                {(!data.schemas || data.schemas.length === 0) &&
                  (!data.contexts || data.contexts.length === 0) && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
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
