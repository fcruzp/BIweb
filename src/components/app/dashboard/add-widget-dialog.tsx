'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Play, BarChart3, Table2, Gauge, Type, MapPin } from 'lucide-react';
import { executeWidgetQuery } from '@/hooks/use-widget-data';
import { ChartRenderer } from '@/components/app/visualization/chart-renderer';
import { DataTable } from '@/components/app/visualization/data-table';
import { detectGeographicColumn } from '@/components/app/visualization/dr-map';
import type { VisualizationConfig } from '@/stores/chat-store';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';

export type WidgetType = 'chart' | 'table' | 'metric' | 'text' | 'map';

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardId: string;
  onWidgetCreated: (widget: {
    id: string;
    title: string;
    widgetType: WidgetType;
    dataSourceId?: string;
    sqlQuery?: string;
    visualization?: string;
    config: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
  }) => void;
  /** Pre-fill values (from "Pin to Dashboard") */
  defaults?: {
    title?: string;
    widgetType?: WidgetType;
    dataSourceId?: string;
    sqlQuery?: string;
    visualization?: VisualizationConfig;
  };
}

export function AddWidgetDialog({
  open,
  onOpenChange,
  dashboardId,
  onWidgetCreated,
  defaults,
}: AddWidgetDialogProps) {
  const dataSources = useAppStore((s) => s.dataSources);
  const { t } = useI18n();

  const [title, setTitle] = useState(defaults?.title || '');
  const [widgetType, setWidgetType] = useState<WidgetType>(defaults?.widgetType || 'chart');
  const [dataSourceId, setDataSourceId] = useState(defaults?.dataSourceId || '');
  const [sqlQuery, setSqlQuery] = useState(defaults?.sqlQuery || '');
  const [visualization, setVisualization] = useState<VisualizationConfig | null>(
    defaults?.visualization || null
  );
  const [previewData, setPreviewData] = useState<{
    data: Array<Record<string, unknown>>;
    columns: string[];
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState('');
  const [provinceColumn, setProvinceColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');

  const handleRunQuery = useCallback(async () => {
    if (!dataSourceId || !sqlQuery) {
      toast.error('Please select a data source and enter a SQL query');
      return;
    }

    setRunning(true);
    setPreviewError(null);
    try {
      const result = await executeWidgetQuery(dataSourceId, sqlQuery);
      setPreviewData({ data: result.data, columns: result.columns });

      // Auto-suggest visualization if not already set
      if (!visualization && result.data.length > 0 && widgetType === 'chart') {
        const columns = result.columns;
        const firstRow = result.data[0];
        const numericCols = columns.filter((c) => typeof firstRow[c] === 'number');
        const stringCols = columns.filter((c) => typeof firstRow[c] === 'string');

        const suggestedViz: VisualizationConfig = {
          chartType: 'bar',
          title: title || 'Chart',
          description: '',
          xAxis: stringCols[0] || columns[0],
          yAxis: numericCols.length > 0 ? [numericCols[0]] : [columns[1] || columns[0]],
        };
        setVisualization(suggestedViz);
      } else if (!visualization && widgetType === 'metric' && result.data.length > 0) {
        const columns = result.columns;
        const firstRow = result.data[0];
        const numericKeys = columns.filter((k) => typeof firstRow[k] === 'number');
        const metrics = numericKeys.slice(0, 4).map((k) => ({
          label: k,
          value: Number(firstRow[k]),
          format: 'number' as const,
        }));

        setVisualization({
          chartType: 'metric',
          title: title || 'Metrics',
          description: '',
          metrics,
        });
      } else if (!visualization && widgetType === 'table') {
        setVisualization({
          chartType: 'table',
          title: title || 'Data Table',
          description: '',
        });
      } else if (!visualization && widgetType === 'map' && result.data.length > 0) {
        // Auto-detect geographic columns for map
        const geoInfo = detectGeographicColumn(result.data, result.columns);
        if (geoInfo) {
          setProvinceColumn(geoInfo.provinceColumn);
          setValueColumn(geoInfo.valueColumn);
          setVisualization({
            chartType: 'heatmap',
            title: title || 'Geographic Map',
            description: '',
            provinceColumn: geoInfo.provinceColumn,
            valueColumn: geoInfo.valueColumn,
            xAxis: geoInfo.provinceColumn,
            yAxis: [geoInfo.valueColumn],
          });
        } else {
          // Fallback: use first string col as province, first numeric as value
          const firstRow = result.data[0];
          const stringCols = result.columns.filter((c) => typeof firstRow[c] === 'string');
          const numericCols = result.columns.filter((c) => typeof firstRow[c] === 'number');
          const provCol = stringCols[0] || result.columns[0];
          const valCol = numericCols[0] || result.columns[1] || result.columns[0];
          setProvinceColumn(provCol);
          setValueColumn(valCol);
          setVisualization({
            chartType: 'heatmap',
            title: title || 'Geographic Map',
            description: '',
            provinceColumn: provCol,
            valueColumn: valCol,
            xAxis: provCol,
            yAxis: [valCol],
          });
        }
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setRunning(false);
    }
  }, [dataSourceId, sqlQuery, visualization, widgetType, title]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a widget title');
      return;
    }

    if (widgetType !== 'text' && (!dataSourceId || !sqlQuery)) {
      toast.error('Please select a data source and enter a SQL query');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/dashboards/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardId,
          title: title.trim(),
          widgetType,
          dataSourceId: widgetType !== 'text' ? dataSourceId : null,
          sqlQuery: widgetType !== 'text' ? sqlQuery : null,
          visualization: visualization || null,
          config: widgetType === 'text' ? { markdown: markdownContent } : {},
          positionX: 0,
          positionY: 0,
          width: widgetType === 'metric' ? 3 : widgetType === 'map' ? 6 : 6,
          height: widgetType === 'metric' ? 3 : widgetType === 'map' ? 5 : 4,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create widget');
      }

      const data = await res.json();
      onWidgetCreated(data.widget);
      resetForm();
      onOpenChange(false);
      toast.success('Widget added to dashboard!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create widget');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setWidgetType('chart');
    setDataSourceId('');
    setSqlQuery('');
    setVisualization(null);
    setPreviewData(null);
    setPreviewError(null);
    setMarkdownContent('');
    setProvinceColumn('');
    setValueColumn('');
  };

  const widgetTypeIcon = (type: WidgetType) => {
    switch (type) {
      case 'chart': return <BarChart3 className="h-4 w-4" />;
      case 'table': return <Table2 className="h-4 w-4" />;
      case 'metric': return <Gauge className="h-4 w-4" />;
      case 'text': return <Type className="h-4 w-4" />;
      case 'map': return <MapPin className="h-4 w-4" />;
    }
  };

  const widgetTypeLabel = (type: WidgetType) => {
    switch (type) {
      case 'chart': return t('widgetTypeChart');
      case 'table': return t('widgetTypeTable');
      case 'metric': return t('widgetTypeMetric');
      case 'text': return t('widgetTypeText');
      case 'map': return t('widgetTypeMap');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('addWidget')}</DialogTitle>
          <DialogDescription>
            {t('addWidgetDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="widget-title">{t('dashboardName')}</Label>
            <Input
              id="widget-title"
              placeholder={t('widgetTitlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Widget Type */}
          <div className="space-y-2">
            <Label>{t('widgetType')}</Label>
            <div className="grid grid-cols-5 gap-2">
              {(['chart', 'table', 'metric', 'map', 'text'] as WidgetType[]).map((type) => (
                <Button
                  key={type}
                  variant={widgetType === type ? 'default' : 'outline'}
                  className={`gap-2 text-xs ${
                    widgetType === type
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'hover:border-emerald-500/50'
                  }`}
                  onClick={() => setWidgetType(type)}
                >
                  {widgetTypeIcon(type)}
                  {widgetTypeLabel(type)}
                </Button>
              ))}
            </div>
          </div>

          {/* Data Source & SQL — hidden for text widgets */}
          {widgetType !== 'text' && (
            <>
              <div className="space-y-2">
                <Label>{t('dataSource')}</Label>
                <Select value={dataSourceId} onValueChange={setDataSourceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('selectDataSource2')} />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources
                      .filter((ds) => ds.status === 'ready')
                      .map((ds) => (
                        <SelectItem key={ds.id} value={ds.id}>
                          {ds.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="widget-sql">{t('sqlQuery2')}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={handleRunQuery}
                    disabled={running || !dataSourceId || !sqlQuery}
                  >
                    {running ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    {t('runQuery')}
                  </Button>
                </div>
                <Textarea
                  id="widget-sql"
                  placeholder="SELECT * FROM table_name LIMIT 100"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="font-mono text-xs min-h-[80px]"
                />
              </div>

              {/* Preview Error */}
              {previewError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <p className="text-xs text-destructive">{previewError}</p>
                </div>
              )}

              {/* Preview */}
              {previewData && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t('previewRows', { count: String(previewData.data.length) })}
                  </Label>
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3 max-h-[200px] overflow-auto">
                    {widgetType === 'chart' && visualization ? (
                      <ChartRenderer visualization={visualization} data={previewData.data} />
                    ) : widgetType === 'metric' && visualization ? (
                      <ChartRenderer visualization={visualization} data={previewData.data} />
                    ) : widgetType === 'map' && visualization ? (
                      <ChartRenderer visualization={visualization} data={previewData.data} />
                    ) : (
                      <DataTable
                        data={previewData.data.slice(0, 5)}
                        columns={previewData.columns}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Text content for text widgets */}
          {widgetType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="widget-text">{t('markdownContent')}</Label>
              <Textarea
                id="widget-text"
                placeholder={t('markdownPlaceholder')}
                className="min-h-[120px]"
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('markdownSupport')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('addWidget')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
