'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  KeyRound,
  Plus,
  Loader2,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Activity,
  CalendarClock,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow, format, isValid } from 'date-fns';
import { toast } from 'sonner';
import { authFetch } from '@/lib/fetch-utils';
import type { ApiScope } from '@/lib/api-auth';
import {
  type ApiKeyView,
  type CreatedApiKey,
  type Locale,
  getDict,
  scopeBadgeClass,
} from './dict';
import { CreateApiKeyDialog } from './create-api-key-dialog';
import { NewKeyRevealDialog } from './new-key-reveal-dialog';

interface ApiKeysManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
}

function safeDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isValid(d) ? d : null;
}

export function ApiKeysManager({ open, onOpenChange, locale }: ApiKeysManagerProps) {
  const t = getDict(locale);

  const [keys, setKeys] = useState<ApiKeyView[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [revealCreated, setRevealCreated] = useState<CreatedApiKey | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ApiKeyView | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await authFetch('/api/settings/api-keys');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data?.error || t('loadError'));
        setKeys([]);
        return;
      }
      setKeys((data?.keys ?? []) as ApiKeyView[]);
    } catch {
      setLoadError(t('loadError'));
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load keys whenever the manager is opened.
  useEffect(() => {
    if (open) loadKeys();
  }, [open, loadKeys]);

  function handleCreated(created: CreatedApiKey) {
    setRevealCreated(created);
    setRevealOpen(true);
    // Optimistically refetch so the new key shows up behind the reveal modal.
    void loadKeys();
  }

  async function handleRevoke() {
    if (!revokeTarget || revoking) return;
    setRevoking(true);
    try {
      const res = await authFetch(`/api/settings/api-keys/${revokeTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || t('revokeError'));
        return;
      }
      toast.success(t('keyRevoked'));
      setRevokeTarget(null);
      await loadKeys();
    } catch {
      toast.error(t('revokeError'));
    } finally {
      setRevoking(false);
    }
  }

  const now = Date.now();

  function keyStatus(k: ApiKeyView): 'active' | 'revoked' | 'expired' {
    if (k.revokedAt) return 'revoked';
    const exp = safeDate(k.expiresAt);
    if (exp && exp.getTime() < now) return 'expired';
    return 'active';
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-background/90 backdrop-blur-xl border-border/30 shadow-2xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-600" />
                {t('title')}
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed pt-1">
                {t('subtitle')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Separator className="opacity-30" />

          {/* Toolbar */}
          <div className="px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span>
                {keys.length}{' '}
                {locale === 'es' ? 'clave(s)' : 'key(s)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={loadKeys}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('createKey')}
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden px-6 pb-2">
            {loading && keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <AlertCircle className="h-6 w-6 mb-3" />
                <span className="text-sm text-center px-6">{loadError}</span>
                <Button variant="outline" size="sm" className="mt-4" onClick={loadKeys}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            ) : keys.length === 0 ? (
              <EmptyState locale={locale} onCreate={() => setCreateOpen(true)} />
            ) : (
              <ScrollArea className="h-full max-h-[42vh] pr-2 -mr-2">
                <div className="space-y-2">
                  {keys.map((k) => {
                    const status = keyStatus(k);
                    const lastUsed = safeDate(k.lastUsedAt);
                    const created = safeDate(k.createdAt);
                    const expires = safeDate(k.expiresAt);
                    return (
                      <div
                        key={k.id}
                        className={`rounded-xl border px-4 py-3 transition-colors ${
                          status === 'active'
                            ? 'border-border/50 bg-muted/20 hover:bg-muted/30'
                            : 'border-border/30 bg-muted/10 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Label + status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {k.label}
                              </span>
                              <StatusBadge status={status} locale={locale} />
                            </div>
                            {/* Masked key */}
                            <div className="mt-1 flex items-center gap-1.5">
                              <code className="font-mono text-xs text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                                {k.maskedKey}
                              </code>
                            </div>
                            {/* Scopes */}
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              {k.scopes.map((s: ApiScope) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className={`text-[9px] uppercase px-1.5 h-4 ${scopeBadgeClass(s)}`}
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>
                            {/* Meta row */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {lastUsed
                                  ? t('lastUsed', {
                                      when: formatDistanceToNow(lastUsed, { addSuffix: true }),
                                    })
                                  : t('neverUsed')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {t('requests', { count: String(k.requestCount) })}
                              </span>
                              {created && (
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {t('createdAt', {
                                    when: format(created, 'PP'),
                                  })}
                                </span>
                              )}
                              {expires && (
                                <span
                                  className={`flex items-center gap-1 ${
                                    status === 'expired' ? 'text-red-500' : ''
                                  }`}
                                >
                                  <CalendarClock className="h-3 w-3" />
                                  {status === 'expired'
                                    ? t('expiredOn', { date: format(expires, 'PP') })
                                    : t('expiresOn', { date: format(expires, 'PP') })}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Revoke */}
                          <div className="shrink-0">
                            {status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => setRevokeTarget(k)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t('revoke')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Security note */}
          <div className="px-6 py-4 shrink-0 border-t border-border/30 bg-muted/20">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
              <span>{t('securityNote')}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create flow */}
      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
        onCreated={handleCreated}
      />

      {/* One-time reveal */}
      <NewKeyRevealDialog
        open={revealOpen}
        onOpenChange={(o) => {
          setRevealOpen(o);
          if (!o) setRevealCreated(null);
        }}
        created={revealCreated}
        locale={locale}
      />

      {/* Revoke confirmation */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(o) => {
          if (!o) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              {t('revokeConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('revokeConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revokeTarget && (
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <div className="text-sm font-medium truncate">{revokeTarget.label}</div>
              <code className="font-mono text-xs text-muted-foreground">
                {revokeTarget.maskedKey}
              </code>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRevoke();
              }}
              disabled={revoking}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {revoking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('revokeAction')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {t('revokeAction')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatusBadge({
  status,
  locale,
}: {
  status: 'active' | 'revoked' | 'expired';
  locale: Locale;
}) {
  const t = getDict(locale);
  if (status === 'active') {
    return (
      <Badge
        variant="outline"
        className="text-[9px] uppercase px-1.5 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
      >
        {t('active')}
      </Badge>
    );
  }
  if (status === 'revoked') {
    return (
      <Badge
        variant="outline"
        className="text-[9px] uppercase px-1.5 h-4 bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
      >
        {t('revoked')}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[9px] uppercase px-1.5 h-4 bg-red-500/10 text-red-500 border-red-500/20"
    >
      {t('expired')}
    </Badge>
  );
}

function EmptyState({
  locale,
  onCreate,
}: {
  locale: Locale;
  onCreate: () => void;
}) {
  const t = getDict(locale);
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
        <KeyRound className="h-7 w-7 text-emerald-600" />
      </div>
      <h3 className="text-base font-semibold">{t('noKeysTitle')}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        {t('noKeysDesc')}
      </p>
      <Button
        size="sm"
        className="mt-5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={onCreate}
      >
        <Plus className="h-4 w-4" />
        {t('createKey')}
      </Button>
    </div>
  );
}
