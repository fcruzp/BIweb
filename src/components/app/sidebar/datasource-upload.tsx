'use client';

import { useState, useCallback } from 'react';
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
import { Upload, Loader2, Database, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';

interface DataSourceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataSourceUpload({ open, onOpenChange }: DataSourceUploadProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { addDataSource } = useAppStore();
  const { t } = useI18n();

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name);

      const res = await fetch('/api/datasources', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        addDataSource(data.datasource);
        toast.success('Data source uploaded and analyzed successfully!');
        setName('');
        setFile(null);
        onOpenChange(false);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to upload data source');
      }
    } catch (error) {
      toast.error('Failed to upload data source');
      console.error(error);
    } finally {
      setUploading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            {t('uploadDataSourceTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('uploadDesc')}
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading} className="bg-emerald-600 hover:bg-emerald-700">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('uploadingAnalyzing')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('uploadBtn')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
