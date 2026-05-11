'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Database, AlertCircle, CheckCircle2, Loader2, Sparkles, FileSearch, X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { useAIConfigStore } from '@/stores/ai-config-store';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { Progress } from '@/components/ui/progress';

interface DataSourceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadStep = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'done' | 'error';

interface StepInfo {
  step: UploadStep;
  label: string;
  sublabel?: string;
  progress?: number; // 0-100
}

export function DataSourceUpload({ open, onOpenChange }: DataSourceUploadProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<UploadStep>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const analyzeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { addDataSource, updateDataSource } = useAppStore();
  const { provider, modelId, openrouterApiKey, customModelId, useCustomModel } = useAIConfigStore();
  const { t } = useI18n();

  const resetState = useCallback(() => {
    setCurrentStep('idle');
    setUploadProgress(0);
    setAnalyzeProgress(0);
    setErrorMessage(null);
    if (analyzeTimerRef.current) {
      clearInterval(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    // If we're in the analyzing step, let it continue in background
    if (analyzeTimerRef.current) {
      clearInterval(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }
    // Reset form state on close
    setName('');
    setFile(null);
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    resetState();
    setCurrentStep('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name);

      // Use XMLHttpRequest for upload progress tracking
      const uploadResult = await new Promise<{ ok: boolean; status: number; data?: unknown; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({ ok: true, status: xhr.status, data: response });
            } else {
              resolve({ ok: false, status: xhr.status, error: response.error || `Upload failed (${xhr.status})` });
            }
          } catch {
            resolve({ ok: false, status: xhr.status, error: `Server error (${xhr.status})` });
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out'));
        });

        xhr.timeout = 120000; // 2 minute timeout for large files
        xhr.open('POST', '/api/datasources');
        xhr.send(formData);
      });

      if (!uploadResult.ok) {
        setCurrentStep('error');
        setErrorMessage(uploadResult.error || 'Upload failed');
        return;
      }

      // Upload complete — show extracting step briefly so user sees progress
      setCurrentStep('extracting');
      setUploadProgress(100);

      const data = uploadResult.data as { datasource?: { id: string; status: string; [key: string]: unknown } };
      if (data.datasource) {
        addDataSource(data.datasource as Parameters<typeof addDataSource>[0]);
      }

      // If the data source is ready, trigger AI analysis
      // Small delay so the user sees the "extracting" step complete
      if (data.datasource?.id && data.datasource?.status === 'ready') {
        // Show extracting step for at least 1.5s so user sees the progress
        await new Promise(resolve => setTimeout(resolve, 1500));

        setCurrentStep('analyzing');
        setAnalyzeProgress(0);

        // Simulate progress for AI analysis (we can't track real progress)
        let fakeProgress = 0;
        analyzeTimerRef.current = setInterval(() => {
          fakeProgress = Math.min(fakeProgress + Math.random() * 8, 90);
          setAnalyzeProgress(Math.round(fakeProgress));
        }, 1000);

        // Fire-and-forget AI analysis (with timeout + retry)
        const analyzeWithRetry = async (datasourceId: string, attempt = 1): Promise<void> => {
          try {
            const controller = new AbortController();
            // 60s timeout — analyze includes AI call which can take 30-45s
            const timeoutId = setTimeout(() => controller.abort(), 60_000);

            const res = await fetch(`/api/datasources/${datasourceId}/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                aiConfig: {
                  provider,
                  modelId: useCustomModel && customModelId ? customModelId : modelId,
                  apiKey: provider === 'openrouter' ? openrouterApiKey : undefined,
                },
              }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const analyzeData = await res.json();
              if (analyzeData.datasource) {
                updateDataSource(datasourceId, analyzeData.datasource as Parameters<typeof updateDataSource>[1]);
              }
              console.log('[Upload] AI analysis completed successfully');
            } else {
              // Log the error details for debugging
              let errorDetail = `HTTP ${res.status}`;
              try {
                const errorData = await res.json();
                errorDetail = errorData.detail || errorData.error || errorDetail;
                console.error('[Upload] AI analysis FAILED:', { status: res.status, error: errorData.error, detail: errorData.detail });
              } catch {
                console.error('[Upload] AI analysis FAILED:', errorDetail);
              }

              // Retry on 502/504 (gateway timeout) — up to 2 attempts
              if ((res.status === 502 || res.status === 504) && attempt < 3) {
                console.log(`[Upload] Retrying AI analysis (attempt ${attempt + 1}/3)...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
                return analyzeWithRetry(datasourceId, attempt + 1);
              }
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              console.warn('[Upload] AI analysis timed out (60s)');
              // Retry once on timeout
              if (attempt < 2) {
                console.log('[Upload] Retrying AI analysis after timeout...');
                return analyzeWithRetry(datasourceId, attempt + 1);
              }
            } else {
              // Non-critical: analysis can be retried later
              console.error('[Upload] AI analysis network error:', err);
            }
          }
        };

        analyzeWithRetry(data.datasource.id)
          .finally(() => {
            if (analyzeTimerRef.current) {
              clearInterval(analyzeTimerRef.current);
              analyzeTimerRef.current = null;
            }
            setAnalyzeProgress(100);
            setCurrentStep('done');
          });
      } else {
        // Data source not ready (error during schema extraction?)
        setCurrentStep('done');
      }
    } catch (error) {
      setCurrentStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      console.error(error);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.db') || droppedFile.name.endsWith('.sqlite') || droppedFile.name.endsWith('.sqlite3'))) {
      setFile(droppedFile);
      if (!name) setName(droppedFile.name);
    } else {
      toast.error('Please upload a SQLite file (.db, .sqlite, .sqlite3)');
    }
  }, [name]);

  const isProcessing = currentStep !== 'idle' && currentStep !== 'done' && currentStep !== 'error';

  // Steps configuration
  const steps = [
    {
      id: 'uploading' as UploadStep,
      icon: Upload,
      labelKey: 'uploadStepUploading',
      sublabelKey: 'uploadStepUploadingDesc',
    },
    {
      id: 'extracting' as UploadStep,
      icon: FileSearch,
      labelKey: 'uploadStepExtracting',
      sublabelKey: 'uploadStepExtractingDesc',
    },
    {
      id: 'analyzing' as UploadStep,
      icon: Sparkles,
      labelKey: 'uploadStepAnalyzing',
      sublabelKey: 'uploadStepAnalyzingDesc',
    },
  ];

  const stepOrder: UploadStep[] = ['uploading', 'extracting', 'analyzing'];

  const getStepStatus = (stepId: UploadStep): 'pending' | 'active' | 'completed' => {
    if (currentStep === 'done') return 'completed';
    const currentIdx = stepOrder.indexOf(currentStep);
    const stepIdx = stepOrder.indexOf(stepId);
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => { if (isProcessing) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            {currentStep === 'idle' ? t('uploadDataSourceTitle') : t('uploadProgressTitle')}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'idle'
              ? t('uploadDesc')
              : currentStep === 'done'
                ? t('uploadCompleteDesc')
                : t('uploadProgressDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Step-by-step progress */}
        {currentStep !== 'idle' && (
          <div className="space-y-3 py-2">
            {steps.map((step, idx) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-start gap-3">
                  {/* Step indicator */}
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all duration-300
                    ${status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : ''}
                    ${status === 'active' ? 'bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/30' : ''}
                    ${status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : status === 'active' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-medium">{idx + 1}</span>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`} />
                      <span className={`text-sm font-medium ${status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {t(step.labelKey as keyof typeof t)}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${status === 'pending' ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                      {t(step.sublabelKey as keyof typeof t)}
                    </p>

                    {/* Progress bar for active step */}
                    {status === 'active' && step.id === 'uploading' && (
                      <div className="mt-2 space-y-1">
                        <Progress value={uploadProgress} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">
                          {uploadProgress < 100 ? `${uploadProgress}%` : t('uploadStepProcessing')}
                        </p>
                      </div>
                    )}
                    {status === 'active' && step.id === 'extracting' && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-emerald-500/20 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{t('uploadStepExtractingTime')}</span>
                        </div>
                      </div>
                    )}
                    {status === 'active' && step.id === 'analyzing' && (
                      <div className="mt-2 space-y-1">
                        <Progress value={analyzeProgress} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">
                          {analyzeProgress < 100 ? t('uploadStepAnalyzingProgress') : t('uploadStepFinishing')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Overall progress bar */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>{t('uploadOverallProgress')}</span>
                <span>
                  {currentStep === 'uploading' ? '~33%'
                    : currentStep === 'extracting' ? '~66%'
                    : currentStep === 'analyzing' ? '~90%'
                    : currentStep === 'done' ? '100%'
                    : ''}
                </span>
              </div>
              <Progress
                value={
                  currentStep === 'uploading' ? 33
                  : currentStep === 'extracting' ? 66
                  : currentStep === 'analyzing' ? 90
                  : currentStep === 'done' ? 100
                  : 0
                }
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {currentStep === 'error' && errorMessage && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{t('uploadFailed')}</p>
              <p className="text-xs mt-1 opacity-80">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Upload form (idle state) */}
        {currentStep === 'idle' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('uploadName')}</Label>
              <Input
                id="name"
                placeholder={t('uploadNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : file
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-border hover:border-emerald-500/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <Database className="h-8 w-8 text-emerald-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t('dragDrop')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('uploadSupported')}
                  </p>
                </div>
              )}
              <input
                type="file"
                accept=".db,.sqlite,.sqlite3"
                className="hidden"
                id="file-input"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    setFile(selectedFile);
                    if (!name) setName(selectedFile.name);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {t('browseFiles')}
              </Button>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {t('uploadAnalyzeNote')}
              </span>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-2">
          {currentStep === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('cancel')}
              </Button>
              <Button onClick={handleUpload} disabled={!file} className="bg-emerald-600 hover:bg-emerald-700">
                <Upload className="h-4 w-4 mr-2" />
                {t('uploadBtn')}
              </Button>
            </>
          )}

          {currentStep === 'analyzing' && (
            <Button variant="outline" onClick={handleClose} className="gap-1.5">
              {t('uploadSkipAnalysis')}
            </Button>
          )}

          {(currentStep === 'done' || currentStep === 'error') && (
            <Button onClick={handleClose} className={currentStep === 'done' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
              {currentStep === 'done' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('uploadStartQuerying')}
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  {t('close')}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
