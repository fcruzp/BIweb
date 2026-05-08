'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import {
  Lightbulb,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

interface ReportMarkdownProps {
  content: string;
}

/**
 * Extract plain text from React children tree for pattern matching.
 */
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
  if (React.isValidElement(children) && children.props.children) {
    return extractTextFromChildren(children.props.children);
  }
  return '';
}

/**
 * List item that detects key:value insight patterns and renders them
 * with emphasized value styling for a report-like feel.
 */
function InsightListItem({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  const childText = extractTextFromChildren(children);

  // Check for "key: value" patterns
  const keyValueMatch = childText.match(/^(.{1,50}?)[：:]\s*(.+)$/);

  if (keyValueMatch) {
    return (
      <li {...props} className="flex items-start gap-2 py-1.5">
        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500/70 shrink-0" />
        <span>
          <span className="text-muted-foreground">{keyValueMatch[1]}:</span>
          <span className="font-semibold text-foreground ml-1">{keyValueMatch[2]}</span>
        </span>
      </li>
    );
  }

  return (
    <li {...props} className="flex items-start gap-2 py-1.5">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500/70 shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  );
}

/**
 * Custom markdown components that transform standard markdown into a
 * professional managerial report style.
 */
function getMarkdownComponents(): Components {
  return {
    // H1 — Main report title with emerald accent bar
    h1: ({ children }) => (
      <div className="mb-4 mt-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <span className="h-7 w-1 rounded-full bg-emerald-500 shrink-0" />
          {children}
        </h1>
        <div className="mt-2 h-px bg-gradient-to-r from-emerald-500/40 via-emerald-500/10 to-transparent" />
      </div>
    ),

    // H2 — Section headers with icon accent
    h2: ({ children }) => (
      <div className="mb-3 mt-5 first:mt-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-500 shrink-0" />
          {children}
        </h2>
        <div className="mt-1.5 h-px bg-border/60" />
      </div>
    ),

    // H3 — Subsection headers
    h3: ({ children }) => (
      <div className="mb-2 mt-4">
        <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3 text-emerald-500/60 shrink-0" />
          {children}
        </h3>
      </div>
    ),

    // Paragraphs — comfortable reading
    p: ({ children }) => (
      <p className="text-sm leading-relaxed text-foreground/80 mb-2 last:mb-0">
        {children}
      </p>
    ),

    // Unordered lists — custom emerald bullets
    ul: ({ children }) => (
      <ul className="my-2 space-y-0.5 list-none pl-0">
        {children}
      </ul>
    ),

    // Ordered lists
    ol: ({ children }) => (
      <ol className="my-2 space-y-1 list-decimal pl-5">
        {children}
      </ol>
    ),

    // List items with insight detection
    li: InsightListItem,

    // Strong/bold text
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">
        {children}
      </strong>
    ),

    // Emphasis/italic
    em: ({ children }) => (
      <em className="italic text-foreground/70">
        {children}
      </em>
    ),

    // Inline code — emerald accent pill
    code: ({ children, className }) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        return <code className={className}>{children}</code>;
      }
      return (
        <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
          {children}
        </code>
      );
    },

    // Code blocks
    pre: ({ children }) => (
      <pre className="bg-muted/40 border border-border/40 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">
        {children}
      </pre>
    ),

    // Blockquotes — styled as insight/callout boxes with icon
    blockquote: ({ children }) => (
      <div className="my-3 flex gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <Lightbulb className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-foreground/80 [&_p]:mb-1 [&_p:last-child]:mb-0">
          {children}
        </div>
      </div>
    ),

    // Horizontal rules — elegant diamond separators
    hr: () => (
      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="h-1 w-1 rotate-45 bg-emerald-500/40" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    ),

    // Tables — professional bordered data tables
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-xs">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-muted/40 border-b border-border/50">
        {children}
      </thead>
    ),

    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold text-foreground/80 whitespace-nowrap">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="px-3 py-2 border-t border-border/30 text-foreground/70">
        {children}
      </td>
    ),

    tr: ({ children }) => (
      <tr className="hover:bg-muted/20 transition-colors">
        {children}
      </tr>
    ),

    // Links — emerald accent
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2"
      >
        {children}
      </a>
    ),
  };
}

/**
 * Post-process the AI content to convert emoji markers into
 * structured markdown that our custom renderer can style.
 */
function preprocessContent(content: string): string {
  let processed = content;

  // Convert "📊 **Query executed successfully** (X rows, Yms)"
  // → styled blockquote callout
  processed = processed.replace(
    /📊\s*\*\*Query executed successfully\*\*\s*\((\d+)\s*rows?,\s*(\d+)ms\)/g,
    '---\n> ✅ **Query executed successfully** — $1 rows returned in $2ms'
  );

  // Convert auto-corrected version
  processed = processed.replace(
    /📊\s*\*\*Query executed successfully\*\*\s*\(auto-corrected after (\d+) attempts?\)\s*\((\d+)\s*rows?,\s*(\d+)ms\)/g,
    '---\n> ✅ **Query executed successfully** (auto-corrected) — $2 rows returned in $3ms'
  );

  return processed;
}

export function ReportMarkdown({ content }: ReportMarkdownProps) {
  const processedContent = preprocessContent(content);

  return (
    <div className="report-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={getMarkdownComponents()}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
