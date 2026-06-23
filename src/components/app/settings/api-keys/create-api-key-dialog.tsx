'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/fetch-utils';
import type { ApiScope } from '@/lib/api-auth';
import {
  type CreatedApiKey,
  type Locale,
  getDict,
  scopeMeta,
} from './dict';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  onCreated: (created: CreatedApiKey) => void;
}

type ExpiryValue = 'never' | '30' | '90' | '365';

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  locale,
  onCreated,
}: CreateApiKeyDialogProps) {
  const t = getDict(locale);
  const metas = scopeMeta(locale, t);

  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<ApiScope[]>(['read']);
  const [expiry, setExpiry] = useState<ExpiryValue>('never');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setLabel('');
    setScopes(['read']);
    setExpiry('never');
    setSubmitting(false);
    setError(null);
  }

  function toggleScope(scope: ApiScope) {
    setError(null);
    setScopes((prev) => {
      if (prev.includes(scope)) {
        const next = prev.filter((s) => s !== scope);
        // Never allow an empty selection — keep at least one.
        return next.length === 0 ? prev : next;
      }
      // Selecting "admin" implies the others, but we keep the selection explicit
      // so the badge list is informative. We just add it.
      return [...prev, scope];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!label.trim()) {
      setError(t('labelField') + ' is required.');
      return;
    }
    if (scopes.length === 0) {
      setError(t('selectScope'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const expiresInDays =
        expiry === 'never' ? undefined : parseInt(expiry, 10);

      const res = await authFetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), scopes, expiresInDays }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || t('createError'));
        return;
      }

      toast.success(t('keyCreated'));
      onCreated(data as CreatedApiKey);
      reset();
      onOpenChange(false);
    } catch {
      setError(t('createError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/30 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-600" />
            {t('createKey')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('createKey')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="api-key-label" className="text-sm">
              {t('labelField')}
            </Label>
            <Input
              id="api-key-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setError(null);
              }}
              placeholder={t('labelPlaceholder')}
              maxLength={60}
              autoFocus
              className="bg-background"
            />
          </div>

          {/* Scopes */}
          <div className="space-y-2">
            <Label className="text-sm">{t('scopes')}</Label>
            <div className="space-y-2">
              {metas.map((meta) => {
                const checked = scopes.includes(meta.id);
                return (
                  <label
                    key={meta.id}
                    htmlFor={`scope-${meta.id}`}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      checked
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      id={`scope-${meta.id}`}
                      checked={checked}
                      onCheckedChange={() => toggleScope(meta.id)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-sm font-medium">{meta.name}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {meta.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Expiration */}
          <div className="space-y-1.5">
            <Label htmlFor="api-key-expiry" className="text-sm">
              {t('expiration')}
            </Label>
            <Select
              value={expiry}
              onValueChange={(v) => setExpiry(v as ExpiryValue)}
            >
              <SelectTrigger id="api-key-expiry" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t('never')}</SelectItem>
                <SelectItem value="30">{t('days30')}</SelectItem>
                <SelectItem value="90">{t('days90')}</SelectItem>
                <SelectItem value="365">{t('year1')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="gap-2 sm:gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t('create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
