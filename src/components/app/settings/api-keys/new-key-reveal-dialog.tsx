'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Copy, KeyRound, ShieldAlert, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import { type CreatedApiKey, type Locale, getDict, scopeBadgeClass } from './dict';

interface NewKeyRevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  created: CreatedApiKey | null;
  locale: Locale;
}

export function NewKeyRevealDialog({
  open,
  onOpenChange,
  created,
  locale,
}: NewKeyRevealDialogProps) {
  const t = getDict(locale);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail in insecure contexts — fall back to select-on-click.
      setCopied(false);
    }
  }, [created]);

  if (!created) return null;

  const { key, meta } = created;
  const curlExample = `curl -H "Authorization: Bearer ${key}" \\\n  https://datamind.mooo.com/api/public/v1/me`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Only allow closing via the explicit confirm button. This prevents
        // accidental dismissal (clicking outside, pressing Escape) that would
        // lose the one-time plaintext forever.
        if (!o) return;
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 bg-background/95 backdrop-blur-xl border-amber-500/30 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-5 w-5" />
              {t('revealTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('revealTitle')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Warning banner */}
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-amber-700 dark:text-amber-300">
              {locale === 'es' ? 'Guárdala ahora' : 'Save it now'}
            </AlertTitle>
            <AlertDescription className="text-amber-700/90 dark:text-amber-300/90">
              {t('revealWarn')}
            </AlertDescription>
          </Alert>

          {/* The key itself */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('maskedLabel')}
            </label>
            <div className="relative">
              <code className="block w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 pr-24 font-mono text-[13px] break-all text-amber-900 dark:text-amber-100 select-all">
                {key}
              </code>
              <Button
                type="button"
                size="sm"
                onClick={handleCopy}
                className="absolute right-1.5 top-1.5 h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {t('copy')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('labelField')}
              </div>
              <div className="font-medium truncate">{meta.label}</div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('createdAt', { when: format(new Date(meta.createdAt), 'PP') })}
              </div>
              <div className="font-medium">
                {meta.expiresAt
                  ? t('expiresOn', { date: format(new Date(meta.expiresAt), 'PP') })
                  : t('never')}
              </div>
            </div>
          </div>

          {/* Scopes */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">{t('scopes')}:</span>
            {meta.scopes.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className={`text-[10px] uppercase ${scopeBadgeClass(s)}`}
              >
                {s}
              </Badge>
            ))}
          </div>

          {/* curl example */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Terminal className="h-3.5 w-3.5" />
              {t('tryIt')}
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border/50 bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed font-mono text-muted-foreground">
              <code>{curlExample}</code>
            </pre>
          </div>

          {/* Confirm button — the ONLY way to close */}
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Check className="h-4 w-4 mr-1.5" />
            {t('saved')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
