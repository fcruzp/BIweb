'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table2, Key, Loader2, Database, Hash } from 'lucide-react';

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

export function SchemaExplorer() {
  const { activeDataSourceId, dataSources } = useAppStore();
  const [schemas, setSchemas] = useState<TableSchemaInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<string>('');

  const activeSource = dataSources.find((s) => s.id === activeDataSourceId);

  useEffect(() => {
    if (!activeDataSourceId) {
      setSchemas([]);
      setContext('');
      return;
    }

    async function loadSchema() {
      setLoading(true);
      try {
        const res = await fetch(`/api/datasources/${activeDataSourceId}`);
        if (res.ok) {
          const data = await res.json();
          setSchemas(data.datasource?.schemas || []);
          setContext(data.datasource?.contexts?.[0]?.summary || '');
        }
      } catch (error) {
        console.error('Failed to load schema:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSchema();
  }, [activeDataSourceId]);

  if (!activeSource) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Data Source Selected</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select a data source from the sidebar to explore its schema.
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
            {schemas.length} tables
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
    </ScrollArea>
  );
}
