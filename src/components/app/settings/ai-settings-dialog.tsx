'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Key,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Rows3,
} from 'lucide-react';
import {
  useAIConfigStore,
  AVAILABLE_MODELS,
  type AIProvider,
} from '@/stores/ai-config-store';
import { LocaleSwitcher } from '@/components/app/locale-switcher';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISettingsDialog({ open, onOpenChange }: AISettingsDialogProps) {
  const {
    provider,
    openrouterApiKey,
    modelId,
    customModelId,
    useCustomModel,
    temperature,
    maxTokens,
    queryRowLimit,
    setProvider,
    setOpenRouterApiKey,
    setModelId,
    setCustomModelId,
    setUseCustomModel,
    setTemperature,
    setMaxTokens,
    setQueryRowLimit,
    isConfigured,
    getEffectiveModelId,
  } = useAIConfigStore();

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const { t } = useI18n();

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === modelId);
  const providerModels = AVAILABLE_MODELS.filter((m) => m.provider === provider);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          modelId: getEffectiveModelId(),
          apiKey: openrouterApiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Connection successful! Model: ${data.model || getEffectiveModelId()}`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Connection failed');
      }
    } catch (error) {
      toast.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const maskedKey = openrouterApiKey
    ? `sk-...${openrouterApiKey.slice(-4)}`
    : 'Not configured';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-500" />
            {t('aiConfiguration')}
          </DialogTitle>
          <DialogDescription>
            {t('aiConfigurationDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('aiProvider')}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProvider('z-ai')}
                className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors ${
                  provider === 'z-ai'
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-border hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{t('zaiBuiltIn')}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {t('zaiBuiltInDesc')}
                </span>
                {provider === 'z-ai' && (
                  <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-500" />
                )}
              </button>

              <button
                onClick={() => setProvider('openrouter')}
                className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors ${
                  provider === 'openrouter'
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-border hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">OpenRouter</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {t('openRouterDesc')}
                </span>
                {provider === 'openrouter' && (
                  <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-500" />
                )}
              </button>
            </div>
          </div>

          <Separator />

          {/* OpenRouter API Key (only shown when OpenRouter is selected) */}
          {provider === 'openrouter' && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                {t('openRouterApiKey')}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    value={openrouterApiKey}
                    onChange={(e) => setOpenRouterApiKey(e.target.value)}
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t('getApiKey')}{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 hover:underline"
                >
                  openrouter.ai/keys
                </a>
                . {t('apiKeyStoredLocally')}
              </p>

              {!openrouterApiKey && (
                <div className="flex items-center gap-2 text-amber-500 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t('apiKeyRequired')}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Model Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t('model')}
            </Label>

            {provider === 'z-ai' ? (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm font-medium">{t('autoBuiltIn')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('autoBuiltInDesc')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={useCustomModel}
                    onCheckedChange={setUseCustomModel}
                    id="custom-model-toggle"
                  />
                  <Label htmlFor="custom-model-toggle" className="text-xs text-muted-foreground">
                    {t('useCustomModelId')}
                  </Label>
                </div>

                {useCustomModel ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="e.g. anthropic/claude-sonnet-4"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter any OpenRouter-compatible model ID. See{' '}
                      <a
                        href="https://openrouter.ai/models"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 hover:underline"
                      >
                        openrouter.ai/models
                      </a>{' '}
                      for all available models.
                    </p>
                  </div>
                ) : (
                  <Select value={modelId} onValueChange={setModelId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {providerModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col items-start">
                            <span className="text-sm">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {model.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">{t('advancedSettings')}</Label>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{t('temperature')}</Label>
                <span className="text-xs font-mono text-emerald-500">{temperature.toFixed(1)}</span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t('precise')}</span>
                <span>{t('creative')}</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{t('maxTokens')}</Label>
                <span className="text-xs font-mono text-emerald-500">{maxTokens}</span>
              </div>
              <Slider
                value={[maxTokens]}
                onValueChange={([v]) => setMaxTokens(v)}
                min={256}
                max={16384}
                step={256}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t('shortTokens')}</span>
                <span>{t('longTokens')}</span>
              </div>
            </div>

            {/* Query Row Limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Rows3 className="h-3 w-3" />
                  {t('queryRowLimit')}
                </Label>
                <span className="text-xs font-mono text-emerald-500">
                  {queryRowLimit === 0 ? t('noLimit') : queryRowLimit}
                </span>
              </div>
              <Select
                value={String(queryRowLimit)}
                onValueChange={(v) => setQueryRowLimit(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('noLimitWarning')}</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="500">500 rows</SelectItem>
                  <SelectItem value="1000">1,000 rows</SelectItem>
                  <SelectItem value="5000">5,000 rows</SelectItem>
                  <SelectItem value="10000">10,000 rows</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {t('rowLimitHint')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Language */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('language')}</Label>
            <p className="text-xs text-muted-foreground">{t('languageDesc')}</p>
            <LocaleSwitcher />
          </div>

          <Separator />

          {/* Status & Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('status')}:</span>
                {isConfigured() ? (
                  <Badge variant="secondary" className="text-emerald-500 gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('ready')}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-amber-500 gap-1 text-[10px]">
                    <AlertTriangle className="h-3 w-3" />
                    {t('needsApiKey')}
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={handleTestConnection}
                disabled={!isConfigured() || testing}
              >
                {testing ? t('testing') : t('testConnection')}
              </Button>
            </div>

            {/* Current Config Summary */}
            <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('provider')}:</span>
                <span className="font-medium">{provider === 'z-ai' ? 'Z-AI (Built-in)' : 'OpenRouter'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('model')}:</span>
                <span className="font-medium font-mono">{getEffectiveModelId()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('rowLimit')}:</span>
                <span className="font-medium font-mono">{queryRowLimit === 0 ? t('noLimit') : queryRowLimit}</span>
              </div>
              {provider === 'openrouter' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('apiKey')}:</span>
                  <span className="font-mono">{maskedKey}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
