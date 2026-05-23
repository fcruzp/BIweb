'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { authFetch } from '@/lib/fetch-utils';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────

interface CustomSvgUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

interface DetectedRegion {
  name: string;
  aliases: string;
}

type Step = 'input' | 'preview' | 'upload';

// ── Constants ────────────────────────────────────────────────

const MAX_SVG_SIZE = 2 * 1024 * 1024; // 2MB
const DATA_NAME_REGEX = /<path[^>]*\bdata-name\s*=\s*"([^"]+)"[^>]*>/gi;

// ── Helpers ──────────────────────────────────────────────────

function extractRegions(svgContent: string): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(DATA_NAME_REGEX.source, DATA_NAME_REGEX.flags);
  while ((match = regex.exec(svgContent)) !== null) {
    names.push(match[1]);
  }
  return names;
}

function sanitizeSvg(svgContent: string): string {
  // Remove script tags and event handlers
  return svgContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
}

// ── Component ────────────────────────────────────────────────

export function CustomSvgUploadDialog({
  open,
  onOpenChange,
  onUploadSuccess,
}: CustomSvgUploadDialogProps) {
  const { t } = useI18n();

  // State
  const [step, setStep] = useState<Step>('input');
  const [svgContent, setSvgContent] = useState('');
  const [regions, setRegions] = useState<DetectedRegion[]>([]);
  const [mapName, setMapName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setStep('input');
      setSvgContent('');
      setRegions([]);
      setMapName('');
      setCountryCode('');
      setValidationError('');
      setIsUploading(false);
      setIsDragOver(false);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Process SVG content — validate and extract regions
  const processSvg = useCallback((content: string) => {
    setSvgContent(content);
    setValidationError('');

    // Size check
    if (content.length > MAX_SVG_SIZE) {
      setValidationError(t('mapCustomSvgTooLarge'));
      return;
    }

    // Extract regions
    const regionNames = extractRegions(content);
    if (regionNames.length === 0) {
      setValidationError(t('mapCustomSvgNoDataName'));
      return;
    }

    setRegions(regionNames.map(name => ({ name, aliases: '' })));
    setStep('preview');
  }, [t]);

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.svg')) {
      setValidationError('Only .svg files are supported');
      return;
    }

    if (file.size > MAX_SVG_SIZE) {
      setValidationError(t('mapCustomSvgTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processSvg(content);
      }
    };
    reader.readAsText(file);
  }, [processSvg, t]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [handleFileSelect]);

  // Handle textarea paste/submit
  const handleTextSubmit = useCallback(() => {
    if (!svgContent.trim()) {
      setValidationError(t('mapCustomSvgNoDataName'));
      return;
    }
    processSvg(svgContent.trim());
  }, [svgContent, processSvg, t]);

  // Go back to input step
  const handleBackToInput = useCallback(() => {
    setStep('input');
    setValidationError('');
  }, []);

  // Proceed to upload step
  const handleProceedToUpload = useCallback(() => {
    setStep('upload');
  }, []);

  // Upload handler
  const handleUpload = useCallback(async () => {
    if (!mapName.trim()) return;

    setIsUploading(true);

    try {
      const body: Record<string, unknown> = {
        name: mapName.trim(),
        svgContent,
        regions: regions.map(r => ({
          name: r.name,
          aliases: r.aliases
            .split(',')
            .map(a => a.trim())
            .filter(a => a.length > 0),
        })),
      };

      if (countryCode.trim()) {
        body.countryCode = countryCode.trim().toUpperCase();
      }

      const res = await authFetch('/api/maps/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('mapCustomSvgError'));
      }

      toast.success(t('mapCustomSvgSuccess'));
      onUploadSuccess?.();
      handleClose(false);
    } catch (err) {
      toast.error(t('mapCustomSvgError'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  }, [mapName, svgContent, regions, countryCode, t, onUploadSuccess, handleClose]);

  // ── Render ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-emerald-500" />
            {t('mapCustomSvgTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('mapCustomSvgDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-1">
          {(['input', 'preview', 'upload'] as Step[]).map((s, idx) => {
            const isActive = step === s;
            const isCompleted = ['input', 'preview', 'upload'].indexOf(step) > idx;
            const labels = ['1', '2', '3'];
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    labels[idx]
                  )}
                </div>
                {idx < 2 && (
                  <div
                    className={`h-0.5 w-8 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: SVG Input */}
        {step === 'input' && (
          <div className="flex flex-col gap-4">
            {/* Textarea for paste */}
            <div className="flex flex-col gap-2">
              <Label>{t('mapCustomSvgPasteSvg')}</Label>
              <Textarea
                value={svgContent}
                onChange={(e) => {
                  setSvgContent(e.target.value);
                  setValidationError('');
                }}
                placeholder="<svg>...</svg>"
                className="min-h-32 font-mono text-xs"
              />
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Drag & drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-muted-foreground/25 hover:border-emerald-500/50 hover:bg-muted/50'
              }`}
            >
              <FileUp className={`h-8 w-8 ${isDragOver ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              <span className="text-sm text-muted-foreground text-center">
                {t('mapCustomSvgDragDrop')}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {t('mapCustomSvgSupported')}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Validation error */}
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Next button */}
            <Button
              onClick={handleTextSubmit}
              disabled={!svgContent.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white self-end"
            >
              {t('save')}
            </Button>
          </div>
        )}

        {/* Step 2: Validation & Preview */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* SVG Preview */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">{t('mapCustomSvgPreview')}</Label>
              <div className="rounded-lg border bg-muted/30 p-4 overflow-auto max-h-48">
                <div
                  className="mx-auto max-w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent) }}
                />
              </div>
            </div>

            {/* Regions list */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('mapCustomSvgRegions')}</Label>
                <span className="text-xs text-emerald-600 font-medium">
                  {t('mapCustomSvgRegionsCount', { count: String(regions.length) })}
                </span>
              </div>

              {regions.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t('mapCustomSvgNoRegions')}
                </div>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="flex flex-col gap-2 pr-3">
                    {regions.map((region, idx) => (
                      <div
                        key={region.name}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border bg-background p-3"
                      >
                        <div className="flex items-center gap-2 min-w-0 sm:w-1/3">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded px-1.5 py-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {region.name}
                          </span>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <Label className="text-xs text-muted-foreground">
                            {t('mapCustomSvgRegionAliases')}
                          </Label>
                          <Input
                            value={region.aliases}
                            onChange={(e) => {
                              const newRegions = [...regions];
                              newRegions[idx] = { ...newRegions[idx], aliases: e.target.value };
                              setRegions(newRegions);
                            }}
                            placeholder={t('mapCustomSvgRegionAliasesPlaceholder')}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBackToInput}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleProceedToUpload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={regions.length === 0}
              >
                {t('save')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Name & Upload */}
        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            {/* Map Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="map-name">{t('mapCustomSvgName')} *</Label>
              <Input
                id="map-name"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder={t('mapCustomSvgNamePlaceholder')}
              />
            </div>

            {/* Country Code */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="country-code">{t('mapCustomSvgCountryCode')}</Label>
              <Input
                id="country-code"
                value={countryCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2);
                  setCountryCode(val);
                }}
                placeholder={t('mapCustomSvgCountryCodePlaceholder')}
                maxLength={2}
                className="w-32"
              />
            </div>

            {/* Summary of regions */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-1">
                {t('mapCustomSvgRegions')}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-emerald-600">
                  {t('mapCustomSvgRegionsCount', { count: String(regions.length) })}
                </span>
              </div>
            </div>

            {/* Navigation buttons */}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep('preview')}
                disabled={isUploading}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!mapName.trim() || isUploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('mapCustomSvgUploading')}
                  </>
                ) : (
                  t('mapCustomSvgUpload')
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
