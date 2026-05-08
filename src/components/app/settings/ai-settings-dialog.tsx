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
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  useAIConfigStore,
  AVAILABLE_MODELS,
  type AIProvider,
} from '@/stores/ai-config-store';
import { toast } from 'sonner';

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
    setProvider,
    setOpenRouterApiKey,
    setModelId,
    setCustomModelId,
    setUseCustomModel,
    setTemperature,
    setMaxTokens,
    isConfigured,
    getEffectiveModelId,
  } = useAIConfigStore();

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

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
            AI Configuration
          </DialogTitle>
          <DialogDescription>
            Configure the AI provider and model for DataMind. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">AI Provider</Label>
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
                  <span className="text-sm font-medium">Z-AI (Built-in)</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Works out of the box. No API key needed.
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
                  Use any model. Requires API key.
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
                OpenRouter API Key
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
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Get your API key at{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 hover:underline"
                >
                  openrouter.ai/keys
                </a>
                . The key is stored locally in your browser.
              </p>

              {!openrouterApiKey && (
                <div className="flex items-center gap-2 text-amber-500 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>An API key is required to use OpenRouter.</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Model Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Model
            </Label>

            {provider === 'z-ai' ? (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm font-medium">Auto (Built-in)</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  The default Z-AI model is used automatically. No configuration needed.
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
                    Use custom model ID
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
            <Label className="text-sm font-semibold">Advanced Settings</Label>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Temperature</Label>
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
                <span>Precise (0)</span>
                <span>Creative (1)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Max Tokens</Label>
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
                <span>Short (256)</span>
                <span>Long (16K)</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status & Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                {isConfigured() ? (
                  <Badge variant="secondary" className="text-emerald-500 gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-amber-500 gap-1 text-[10px]">
                    <AlertTriangle className="h-3 w-3" />
                    Needs API Key
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
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            {/* Current Config Summary */}
            <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-medium">{provider === 'z-ai' ? 'Z-AI (Built-in)' : 'OpenRouter'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium font-mono">{getEffectiveModelId()}</span>
              </div>
              {provider === 'openrouter' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key:</span>
                  <span className="font-mono">{maskedKey}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
