'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Upload,
  Map,
  Trash2,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/hooks/use-i18n';
import { MAP_REGISTRY } from '@/lib/map-registry';
import type { MapConfig, MapRegion } from '@/lib/map-registry';
import { CustomSvgUploadDialog } from '@/components/app/visualization/custom-svg-upload-dialog';
import { authFetch } from '@/lib/fetch-utils';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────

interface MapLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CustomMapItem {
  id: string;
  name: string;
  countryCode: string | null;
  source: string;
  regionCount: number;
  isPublic: boolean;
}

interface CustomMapDetail {
  id: string;
  name: string;
  countryCode: string | null;
  svgContent: string;
  regions: MapRegion[];
  isPublic: boolean;
}

// ── Flags ────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  DO: '🇩🇴', US: '🇺🇸', MX: '🇲🇽', CO: '🇨🇴', AR: '🇦🇷',
  CL: '🇨🇱', PE: '🇵🇪', BR: '🇧🇷', ES: '🇪🇸',
};

// ── Map Preview Thumbnail ────────────────────────────────────

function MapThumbnail({ config, isCustom, svgContent }: {
  config: MapConfig;
  isCustom?: boolean;
  svgContent?: string;
}) {
  // For custom maps, parse the SVG content
  const customPaths = useMemo(() => {
    if (!svgContent) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return null;

      const viewBox = svgEl.getAttribute('viewBox') || '0 0 500 500';
      const pathElements = svgEl.querySelectorAll('path[data-name]');
      const paths: Record<string, string> = {};

      pathElements.forEach((pathEl) => {
        const name = pathEl.getAttribute('data-name')?.trim();
        const d = pathEl.getAttribute('d');
        if (name && d && !paths[name]) {
          paths[name] = d;
        }
      });

      return { paths, viewBox };
    } catch {
      return null;
    }
  }, [svgContent]);

  const effectivePaths = customPaths?.paths || config.paths;
  const effectiveViewBox = customPaths?.viewBox || config.viewBox || '0 0 500 500';

  // Pick a subset of regions to show (max ~20 for performance in thumbnails)
  const displayRegions = useMemo(() => {
    const regions = config.regions;
    if (regions.length <= 25) return regions;
    // Take every Nth region for a representative sample
    const step = Math.ceil(regions.length / 20);
    return regions.filter((_, i) => i % step === 0);
  }, [config.regions]);

  return (
    <div className="w-full aspect-[4/3] bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg border border-border/30 overflow-hidden flex items-center justify-center p-2">
      <svg
        viewBox={effectiveViewBox}
        className="w-full h-full"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      >
        {displayRegions.map((region, idx) => {
          const path = effectivePaths[region.name];
          if (!path) return null;

          // Assign a gradient of emerald colors for visual appeal
          const ratio = config.regions.length > 1 ? idx / (config.regions.length - 1) : 0;
          const lightness = 80 - ratio * 35;
          const saturation = 30 + ratio * 30;

          // Calculate stroke width relative to viewBox
          const vbParts = effectiveViewBox.split(' ');
          const vbWidth = vbParts.length >= 3 ? parseFloat(vbParts[2]) : 500;
          const strokeW = vbWidth * 0.001;

          return (
            <path
              key={region.name}
              d={path}
              fill={`hsl(160, ${saturation}%, ${lightness}%)`}
              stroke="hsl(0, 0%, 70%)"
              strokeWidth={strokeW}
              opacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ── Map Card ─────────────────────────────────────────────────

function MapCard({ config, isCustom, customMap, onDelete }: {
  config: MapConfig;
  isCustom?: boolean;
  customMap?: CustomMapDetail;
  onDelete?: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const name = isCustom
    ? (customMap?.name || t('mapCustom'))
    : (locale === 'es' ? config.name : config.nameEn);

  const regionLabel = isCustom
    ? t('mapCustom')
    : (locale === 'es' ? config.regionLabel : config.regionLabelEn);

  const flag = isCustom ? '🗺️' : (COUNTRY_FLAGS[config.countryCode] || '🗺️');

  const handleDelete = async () => {
    if (!customMap || !onDelete) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/maps/${customMap.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(customMap.id);
        toast.success(t('mapCustomSvgDelete'));
      }
    } catch {
      toast.error(t('mapCustomSvgError'));
    } finally {
      setDeleting(false);
    }
  };

  // Get region list for expanded view
  const regionNames = config.regions.map(r => r.name);

  return (
    <div className="group rounded-xl border border-border/40 bg-card shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-200 overflow-hidden">
      {/* Thumbnail */}
      <MapThumbnail
        config={config}
        isCustom={isCustom}
        svgContent={customMap?.svgContent}
      />

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate flex items-center gap-1.5">
              <span className="text-base">{flag}</span>
              {name}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {config.regions.length} {regionLabel}
            </p>
          </div>
          {isCustom && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-5 shrink-0">
              {t('mapCustom')}
            </Badge>
          )}
          {!isCustom && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 shrink-0 text-emerald-600 border-emerald-500/30">
              {t('mapSystem')}
            </Badge>
          )}
        </div>

        {/* Region list toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
        >
          {expanded ? t('hideRawData') : `${t('mapCustomSvgRegions')} (${regionNames.length})`}
        </button>

        {expanded && (
          <ScrollArea className="max-h-32">
            <div className="flex flex-wrap gap-1 pr-2">
              {regionNames.map(name => (
                <span
                  key={name}
                  className="text-[9px] bg-muted/60 rounded px-1.5 py-0.5 text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Actions for custom maps */}
        {isCustom && onDelete && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              {t('delete')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dialog ──────────────────────────────────────────────

export function MapLibraryDialog({ open, onOpenChange }: MapLibraryDialogProps) {
  const { t, locale } = useI18n();
  const [customMaps, setCustomMaps] = useState<CustomMapDetail[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('system');

  // Fetch custom maps
  const fetchCustomMaps = useCallback(async () => {
    setLoadingCustom(true);
    try {
      const res = await authFetch('/api/maps');
      if (res.ok) {
        const data = await res.json();
        const userMaps = (data.maps || []).filter((m: CustomMapItem) => m.source === 'user');

        // Fetch full details for each custom map (to get svgContent)
        const detailed = await Promise.all(
          userMaps.map(async (m: CustomMapItem) => {
            try {
              const detailRes = await authFetch(`/api/maps/${m.id}`);
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                return detailData.map as CustomMapDetail;
              }
            } catch {
              // Skip failed fetches
            }
            return null;
          })
        );

        setCustomMaps(detailed.filter(Boolean) as CustomMapDetail[]);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingCustom(false);
    }
  }, []);

  // Fetch custom maps when dialog opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      fetchCustomMaps();
    }
    onOpenChange(newOpen);
  }, [onOpenChange, fetchCustomMaps]);

  // Handle custom map deletion
  const handleDeleteCustomMap = useCallback((id: string) => {
    setCustomMaps(prev => prev.filter(m => m.id !== id));
  }, []);

  // Filter system maps by search
  const filteredSystemMaps = useMemo(() => {
    const entries = Object.entries(MAP_REGISTRY);
    if (!searchQuery.trim()) return entries;

    const q = searchQuery.toLowerCase();
    return entries.filter(([code, config]) => {
      const nameEs = config.name.toLowerCase();
      const nameEn = config.nameEn.toLowerCase();
      const regionNames = config.regions.map(r => r.name.toLowerCase()).join(' ');
      return nameEs.includes(q) || nameEn.includes(q) || code.toLowerCase().includes(q) || regionNames.includes(q);
    });
  }, [searchQuery]);

  // Filter custom maps by search
  const filteredCustomMaps = useMemo(() => {
    if (!searchQuery.trim()) return customMaps;
    const q = searchQuery.toLowerCase();
    return customMaps.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.countryCode || '').toLowerCase().includes(q)
    );
  }, [customMaps, searchQuery]);

  // Create a fake MapConfig for each custom map (for rendering)
  const getCustomMapConfig = useCallback((customMap: CustomMapDetail): MapConfig => {
    const parsedRegions = Array.isArray(customMap.regions) ? customMap.regions : [];
    const code = customMap.countryCode || 'XX';

    // Try to get region label from registry
    const existingConfig = MAP_REGISTRY[code.toUpperCase()];
    const regionLabel = existingConfig?.regionLabel || 'regiones';
    const regionLabelEn = existingConfig?.regionLabelEn || 'regions';

    // Parse paths from SVG
    let paths: Record<string, string> = {};
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(customMap.svgContent, 'image/svg+xml');
      const pathElements = doc.querySelectorAll('path[data-name]');
      pathElements.forEach((pathEl) => {
        const name = pathEl.getAttribute('data-name')?.trim();
        const d = pathEl.getAttribute('d');
        if (name && d) paths[name] = d;
      });
    } catch {
      // Empty paths
    }

    return {
      countryCode: code,
      name: customMap.name,
      nameEn: customMap.name,
      regionLabel,
      regionLabelEn,
      regions: parsedRegions as MapRegion[],
      paths,
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            {t('mapLibraryTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('mapLibraryDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('mapLibrarySearch')}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs: System Maps | My Custom Maps */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-6">
          <div className="flex items-center justify-between pb-3">
            <TabsList className="h-8">
              <TabsTrigger value="system" className="text-xs gap-1.5 px-3">
                <Map className="h-3.5 w-3.5" />
                {t('mapSystemMaps')}
                <Badge variant="secondary" className="text-[9px] ml-1 px-1.5 py-0 h-4">
                  {Object.keys(MAP_REGISTRY).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs gap-1.5 px-3">
                <Globe className="h-3.5 w-3.5" />
                {t('mapCustomSvgLibrary')}
                {customMaps.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] ml-1 px-1.5 py-0 h-4">
                    {customMaps.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {t('mapCustomSvg')}
            </Button>
          </div>

          {/* System Maps Grid */}
          <TabsContent value="system" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-[55vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 pr-3">
                {filteredSystemMaps.map(([code, config]) => (
                  <MapCard key={code} config={config} />
                ))}
                {filteredSystemMaps.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">{t('mapLibraryNoResults')}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Custom Maps Grid */}
          <TabsContent value="custom" className="flex-1 min-h-0 mt-0">
            {loadingCustom ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : customMaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Map className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">{t('mapLibraryNoCustom')}</p>
                <p className="text-xs mt-1 max-w-xs text-center">{t('mapLibraryNoCustomDesc')}</p>
                <Button
                  size="sm"
                  className="mt-4 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t('mapCustomSvg')}
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[55vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 pr-3">
                  {filteredCustomMaps.map(customMap => (
                    <MapCard
                      key={customMap.id}
                      config={getCustomMapConfig(customMap)}
                      isCustom
                      customMap={customMap}
                      onDelete={handleDeleteCustomMap}
                    />
                  ))}
                  {filteredCustomMaps.length === 0 && searchQuery && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">{t('mapLibraryNoResults')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Upload dialog */}
      <CustomSvgUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadSuccess={fetchCustomMaps}
      />
    </Dialog>
  );
}
