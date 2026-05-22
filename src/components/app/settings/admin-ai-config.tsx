'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Key,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Zap,
  Globe,
} from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch } from '@/lib/fetch-utils';
import { toast } from 'sonner';

// ============================================================
// Available OpenRouter models — curated list with free tier info
// ============================================================

interface ModelOption {
  id: string;
  name: string;
  description: string;
  isFree?: boolean;
}

const MODEL_OPTIONS: ModelOption[] = [
  // Free models
  { id: 'google/gemini-2.5-flash-preview:free', name: 'Gemini 2.5 Flash (Free)', description: 'Free tier — fast, great for most tasks', isFree: true },
  { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick (Free)', description: 'Free tier — Meta open model', isFree: true },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (Free)', description: 'Free tier — strong reasoning', isFree: true },
  { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B (Free)', description: 'Free tier — large model', isFree: true },

  // Paid models
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, versatile — great for structured outputs' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Latest Anthropic — excellent for SQL and analysis' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Fast and capable — great balance' },
  { id: 'x-ai/grok-3-mini-beta', name: 'Grok 3 Mini', description: 'xAI — fast, efficient' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Reasoning model — complex analytical queries' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Strong open-source — reliable for SQL' },
];

// ============================================================
// Config state interface
// ============================================================

interface ConfigState {
  source: 'database' | 'env' | 'none';
  apiKey: string;       // masked (***xxxx) or empty
  hasKey: boolean;
  model: string;
  baseUrl: string;
  isActive: boolean;
  lastVerified: string | null;
}

// ============================================================
// Component
// ============================================================

export function AdminAIConfig() {
  const { t } = useI18n();

  // Editable form state
  const [editApiKey, setEditApiKey] = useState('');
  const [editModel, setEditModel] = useState('google/gemini-2.5-flash');
  const [editBaseUrl, setEditBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Original config from server
  const [config, setConfig] = useState<ConfigState | null>(null);

  // Track if the user changed the API key field
  const [keyChanged, setKeyChanged] = useState(false);

  // Load current config
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/admin/ai-config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditModel(data.model);
        setEditBaseUrl(data.baseUrl);

        // Check if the current model is in our predefined list
        const modelInList = MODEL_OPTIONS.some(m => m.id === data.model);
        if (!modelInList) {
          setUseCustomModel(true);
          setCustomModelId(data.model);
        }
      } else {
        toast.error('Failed to load AI config');
      }
    } catch {
      toast.error('Network error loading AI config');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Save config
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const effectiveModel = useCustomModel ? customModelId.trim() : editModel;

      const body: Record<string, unknown> = {
        model: effectiveModel,
        baseUrl: editBaseUrl,
        isActive: true,
      };

      // Only send API key if the user actually changed it
      if (keyChanged) {
        body.apiKey = editApiKey;
      }

      const res = await authFetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(t('aiConfigSaved'));
        setKeyChanged(false);
        setEditApiKey('');
        setTestResult(null);
        // Reload config to get masked key
        await loadConfig();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('aiConfigSaveError'));
      }
    } catch {
      toast.error(t('aiConfigSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const effectiveModel = useCustomModel ? customModelId.trim() : editModel;

      const body: Record<string, string> = {
        model: effectiveModel,
        baseUrl: editBaseUrl,
      };

      // If user entered a new key, test with that
      if (keyChanged && editApiKey) {
        body.apiKey = editApiKey;
      }

      const res = await authFetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `✅ ${t('aiTestSuccess')} (${data.timing_ms}ms) — "${data.response}"`,
        });
        toast.success(t('aiTestSuccess'));
      } else {
        const hint = data.hint ? ` — ${data.hint}` : '';
        setTestResult({
          success: false,
          message: `❌ ${data.error}${hint}`,
        });
        toast.error(data.error || t('aiTestFailed'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('aiTestFailed');
      setTestResult({ success: false, message: `❌ ${msg}` });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const effectiveModel = useCustomModel ? customModelId.trim() : editModel;
  const currentModelInfo = MODEL_OPTIONS.find(m => m.id === editModel);

  return (
    <div className="space-y-4">
      {/* Config source indicator */}
      {config && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>
            {config.source === 'database'
              ? t('aiConfigSourceDB')
              : config.hasKey
                ? t('aiConfigSourceEnv')
                : t('aiConfigSourceNone')}
          </span>
          {config.lastVerified && (
            <span className="ml-auto">
              {t('aiLastVerified')}: {new Date(config.lastVerified).toLocaleString()}
            </span>
          )}
        </div>
      )}

      <Separator className="opacity-20" />

      {/* API Key */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Key className="h-3 w-3" />
          {t('openRouterApiKey')}
        </Label>

        {config?.hasKey && !keyChanged && (
          <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
            <span className="text-xs font-mono text-muted-foreground">{config.apiKey}</span>
            <Badge variant="outline" className="text-[9px] px-1 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {t('aiKeySet')}
            </Badge>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder={config?.hasKey ? t('aiKeyPlaceholderChange') : 'sk-or-v1-...'}
              value={editApiKey}
              onChange={(e) => {
                setEditApiKey(e.target.value);
                setKeyChanged(true);
              }}
              className="pr-10 font-mono text-xs h-8"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
          {' · '}
          <a
            href="https://openrouter.ai/credits"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:underline"
          >
            {t('aiCredits')}
          </a>
        </p>

        {!config?.hasKey && !keyChanged && (
          <div className="flex items-center gap-2 text-amber-500 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t('aiKeyRequired')}</span>
          </div>
        )}
      </div>

      <Separator className="opacity-20" />

      {/* Model Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          {t('model')}
        </Label>

        <div className="flex items-center gap-3">
          <Switch
            checked={useCustomModel}
            onCheckedChange={setUseCustomModel}
            id="custom-model-toggle"
          />
          <Label htmlFor="custom-model-toggle" className="text-[10px] text-muted-foreground">
            {t('useCustomModelId')}
          </Label>
        </div>

        {useCustomModel ? (
          <div className="space-y-1">
            <Input
              placeholder="e.g. google/gemini-2.5-flash"
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              className="font-mono text-xs h-8"
            />
            <p className="text-[10px] text-muted-foreground">
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 hover:underline"
              >
                openrouter.ai/models
              </a>
            </p>
          </div>
        ) : (
          <Select value={editModel} onValueChange={setEditModel}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {MODEL_OPTIONS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    {model.isFree && (
                      <Badge variant="outline" className="text-[8px] px-1 h-3.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <Zap className="h-2 w-2 mr-0.5" />FREE
                      </Badge>
                    )}
                    <div className="flex flex-col items-start">
                      <span className="text-xs">{model.name}</span>
                      <span className="text-[10px] text-muted-foreground">{model.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {currentModelInfo?.isFree && (
          <div className="flex items-center gap-2 text-emerald-600 text-xs bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>{t('aiModelFree')}</span>
          </div>
        )}
      </div>

      <Separator className="opacity-20" />

      {/* Base URL */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          {t('aiBaseUrl')}
        </Label>
        <Input
          value={editBaseUrl}
          onChange={(e) => setEditBaseUrl(e.target.value)}
          className="font-mono text-xs h-8"
          placeholder="https://openrouter.ai/api/v1"
        />
        <p className="text-[10px] text-muted-foreground">{t('aiBaseUrlDesc')}</p>
      </div>

      <Separator className="opacity-20" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-8"
          onClick={handleTest}
          disabled={isTesting || (!config?.hasKey && !keyChanged)}
        >
          {isTesting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('testing')}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3" />
              {t('testConnection')}
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Key className="h-3 w-3" />
              {t('save')}
            </>
          )}
        </Button>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`text-xs rounded-lg p-2 border ${
          testResult.success
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400'
        }`}>
          {testResult.message}
        </div>
      )}

      {/* Config summary */}
      <div className="bg-muted/30 rounded-lg p-3 text-[11px] space-y-1 border border-border/30">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('model')}:</span>
          <span className="font-medium font-mono">{effectiveModel || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('apiKey')}:</span>
          <span className="font-mono">
            {keyChanged
              ? (editApiKey ? `***${editApiKey.slice(-4)}` : t('aiKeyRemove'))
              : (config?.hasKey ? config.apiKey : t('aiKeyNotSet'))}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('aiBaseUrl')}:</span>
          <span className="font-mono text-[10px]">{editBaseUrl}</span>
        </div>
      </div>
    </div>
  );
}
