'use client';

import type { ChatMessage } from '@/stores/chat-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  User,
  Brain,
  Code2,
  ChevronDown,
  Copy,
  Check,
  Clock,
  Rows3,
  Table2,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChartRenderer } from '../visualization/chart-renderer';
import { DataTable } from '../visualization/data-table';

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [sqlOpen, setSqlOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTable, setShowTable] = useState(false);

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

  // Assistant message
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-500">
        <Brain className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 max-w-[90%]">
        {/* Analysis text */}
        <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* SQL Code Block */}
        {message.sqlQuery && (
          <Collapsible open={sqlOpen} onOpenChange={setSqlOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7 border-border/50"
              >
                <Code2 className="h-3 w-3" />
                SQL Query
                <ChevronDown className={`h-3 w-3 transition-transform ${sqlOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 relative">
                <pre className="bg-muted/50 border border-border/50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                  <code>{message.sqlQuery}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={copySQL}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Query result metadata */}
        {message.queryResult && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary" className="gap-1">
              <Rows3 className="h-3 w-3" />
              {message.queryResult.rowCount} rows
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {message.queryResult.executionTime}ms
            </Badge>
            {message.confidence !== undefined && (
              <Badge
                variant="secondary"
                className={message.confidence > 0.7 ? 'text-emerald-500' : message.confidence > 0.4 ? 'text-amber-500' : 'text-red-500'}
              >
                {Math.round(message.confidence * 100)}% confidence
              </Badge>
            )}
          </div>
        )}

        {/* Visualization */}
        {message.visualization && message.queryResult && (
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                {message.visualization.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ChartRenderer
                visualization={message.visualization}
                data={message.queryResult.data}
              />
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => setShowTable(!showTable)}
                >
                  <Table2 className="h-3 w-3" />
                  {showTable ? 'Hide Table' : 'Show Raw Data'}
                </Button>
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
        {message.queryResult && !message.visualization && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <DataTable data={message.queryResult.data} columns={message.queryResult.columns} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
