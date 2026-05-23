'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, ChevronDown, Upload, Map, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useI18n } from '@/hooks/use-i18n';
import { MAP_REGISTRY, getMapConfig } from '@/lib/map-registry';
import type { MapConfig, MapRegion } from '@/lib/map-registry';
import { CustomSvgUploadDialog } from '@/components/app/visualization/custom-svg-upload-dialog';
import { authFetch } from '@/lib/fetch-utils';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────

interface CustomMapItem {
  id: string;
  name: string;
  countryCode: string | null;
  source: string;
  regionCount: number;
  isPublic: boolean;
}

interface MapSelectorProps {
  /** Currently selected country code or custom map ID */
  value: string;
  /** Callback when user selects a country or custom map */
  onChange: (countryCode: string) => void;
  /** Whether auto-detection was used */
  autoDetected?: boolean;
  /** Callback when a custom map is selected — provides svgContent and regions */
  onCustomMapSelect?: (svgContent: string, regions: MapRegion[]) => void;
  /** Callback when switching back to a system map */
  onSystemMapSelect?: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  DO: '🇩🇴',
  US: '🇺🇸',
  MX: '🇲🇽',
  CO: '🇨🇴',
  AR: '🇦🇷',
  CL: '🇨🇱',
  PE: '🇵🇪',
  BR: '🇧🇷',
  ES: '🇪🇸',
};

/**
 * Map selector dropdown for choosing which country's map to use
 * in a geographic heatmap visualization.
 * Shows system maps (from MAP_REGISTRY) and user custom maps (from API).
 */
export function MapSelector({ value, onChange, autoDetected, onCustomMapSelect, onSystemMapSelect }: MapSelectorProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [customUploadOpen, setCustomUploadOpen] = useState(false);
  const [customMaps, setCustomMaps] = useState<CustomMapItem[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentConfig = getMapConfig(value);
  const isCustomMap = value.startsWith('custom-');
  const displayName = currentConfig
    ? (locale === 'es' ? currentConfig.name : currentConfig.nameEn)
    : isCustomMap
      ? customMaps.find(m => m.id === value.replace('custom-', ''))?.name || t('mapCustom')
      : value;

  // Fetch custom maps when popover opens
  const fetchCustomMaps = useCallback(async () => {
    setLoadingCustom(true);
    try {
      const res = await authFetch('/api/maps');
      if (res.ok) {
        const data = await res.json();
        // Filter only user custom maps (not system maps already in MAP_REGISTRY)
        const userMaps = (data.maps || []).filter(
          (m: CustomMapItem) => m.source === 'user'
        );
        setCustomMaps(userMaps);
      }
    } catch {
      // Silently fail — custom maps are optional
    } finally {
      setLoadingCustom(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCustomMaps();
    }
  }, [open, fetchCustomMaps]);

  // Handle custom map selection
  const handleCustomMapSelect = useCallback(async (mapId: string) => {
    try {
      const res = await authFetch(`/api/maps/${mapId}`);
      if (!res.ok) throw new Error('Failed to load map');
      const data = await res.json();

      if (data.map?.svgContent && onCustomMapSelect) {
        onCustomMapSelect(data.map.svgContent, data.map.regions || []);
        onChange(`custom-${mapId}`);
        setOpen(false);
      }
    } catch {
      toast.error(t('mapCustomSvgError'));
    }
  }, [onCustomMapSelect, onChange, t]);

  // Handle system map selection
  const handleSystemMapSelect = useCallback((code: string) => {
    onSystemMapSelect?.();
    onChange(code);
    setOpen(false);
  }, [onSystemMapSelect, onChange]);

  // Handle custom map deletion
  const handleDeleteCustomMap = useCallback(async (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(mapId);
    try {
      const res = await authFetch(`/api/maps/${mapId}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomMaps(prev => prev.filter(m => m.id !== mapId));
        toast.success(t('mapCustomSvgDelete'));
      }
    } catch {
      toast.error(t('mapCustomSvgError'));
    } finally {
      setDeletingId(null);
    }
  }, [t]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
        >
          <Globe className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-medium">
            {isCustomMap ? '🗺️' : (COUNTRY_FLAGS[value] || '🗺️')} {displayName}
          </span>
          {autoDetected && !isCustomMap && (
            <span className="text-[10px] text-emerald-500 font-normal">
              auto
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {/* System maps */}
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          {t('mapSelectCountry')}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {Object.entries(MAP_REGISTRY).map(([code, config]) => {
            const name = locale === 'es' ? config.name : config.nameEn;
            const isSelected = code === value;

            return (
              <button
                key={code}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSystemMapSelect(code)}
              >
                <span className="text-base">{COUNTRY_FLAGS[code] || '🗺️'}</span>
                <span className="flex-1 text-left">{name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {config.regions.length} {locale === 'es' ? config.regionLabel : config.regionLabelEn}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom maps section */}
        {customMaps.length > 0 && (
          <>
            <div className="border-t mt-1 pt-1">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                {t('mapCustomSvgLibrary')}
              </div>
              <div className="max-h-40 overflow-y-auto">
                {customMaps.map((map) => {
                  const isSelected = `custom-${map.id}` === value;
                  const isDeleting = deletingId === map.id;

                  return (
                    <div
                      key={map.id}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors group ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <button
                        className="flex-1 flex items-center gap-2 text-left"
                        onClick={() => handleCustomMapSelect(map.id)}
                        disabled={isDeleting}
                      >
                        <Map className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="flex-1 truncate text-xs">{map.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {map.regionCount} {t('regionsWithData', { matched: '', total: String(map.regionCount), regionLabel: '' }).replace(/de\s*\d+\s*/g, '').trim()}
                        </span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteCustomMap(map.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Upload Custom Map button */}
        <div className="border-t mt-1 pt-1">
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
            onClick={() => {
              setOpen(false);
              setCustomUploadOpen(true);
            }}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="flex-1 text-left text-xs font-medium">{t('mapCustomSvg')}</span>
          </button>
        </div>
      </PopoverContent>
      <CustomSvgUploadDialog
        open={customUploadOpen}
        onOpenChange={setCustomUploadOpen}
        onUploadSuccess={fetchCustomMaps}
      />
    </Popover>
  );
}
