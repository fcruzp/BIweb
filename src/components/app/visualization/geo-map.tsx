'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import type { MapConfig, MapRegion } from '@/lib/map-registry';
import { normalizeRegionName } from '@/lib/map-registry';

// ============================================================
// Color utilities
// ============================================================

function getHeatColor(value: number, min: number, max: number): string {
  if (max === min) return 'hsl(160, 60%, 45%)';

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Gradient from very light emerald to deep emerald
  const lightness = 85 - ratio * 45; // 85% → 40%
  const saturation = 30 + ratio * 40; // 30% → 70%
  return `hsl(160, ${saturation}%, ${lightness}%)`;
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

// ============================================================
// Custom SVG Parsing
// ============================================================

interface ParsedCustomMap {
  regions: MapRegion[];
  paths: Record<string, string>;
  viewBox: string;
}

/**
 * Parse a custom SVG string and extract regions + paths.
 * Expects <path data-name="Region Name" d="M ... Z" /> elements.
 */
function parseCustomSvg(svgContent: string): ParsedCustomMap | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');

    if (!svgEl) return null;

    // Extract viewBox
    const viewBox = svgEl.getAttribute('viewBox') || '0 0 500 500';

    // Extract paths
    const pathElements = svgEl.querySelectorAll('path[data-name]');
    const regions: MapRegion[] = [];
    const paths: Record<string, string> = {};

    pathElements.forEach((pathEl) => {
      const name = pathEl.getAttribute('data-name')?.trim();
      const d = pathEl.getAttribute('d');

      if (name && d) {
        // Avoid duplicates
        if (!paths[name]) {
          paths[name] = d;
          const id = pathEl.getAttribute('data-id') || undefined;
          regions.push({ name, id, aliases: [] });
        }
      }
    });

    if (regions.length === 0) return null;

    return { regions, paths, viewBox };
  } catch {
    return null;
  }
}

// ============================================================
// GeoMap Component
// ============================================================

interface GeoMapProps {
  /** Row data to visualize */
  data: Array<Record<string, unknown>>;
  /** Column name containing region/province identifiers */
  regionColumn: string;
  /** Column name containing numeric values */
  valueColumn: string;
  /** Optional title displayed above the map */
  title?: string;
  /** Map configuration (regions, paths, aliases) — used for system maps */
  mapConfig: MapConfig;
  /** Optional custom SVG content — overrides mapConfig when provided */
  customSvgContent?: string;
  /** Custom map regions with aliases — used with customSvgContent */
  customRegions?: MapRegion[];
}

interface TooltipInfo {
  region: string;
  value: number;
  x: number;
  y: number;
}

export function GeoMap({ data, regionColumn, valueColumn, title, mapConfig, customSvgContent, customRegions }: GeoMapProps) {
  const { t, locale } = useI18n();
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Parse custom SVG if provided
  const parsedCustom = useMemo(() => {
    if (!customSvgContent) return null;
    return parseCustomSvg(customSvgContent);
  }, [customSvgContent]);

  // Determine which config to use
  const effectiveConfig = useMemo(() => {
    if (parsedCustom) {
      // Merge custom regions with any provided aliases
      const mergedRegions = customRegions && customRegions.length > 0
        ? parsedCustom.regions.map((r) => {
            const customMatch = customRegions.find((cr) => cr.name === r.name);
            return customMatch ? { ...r, aliases: customMatch.aliases } : r;
          })
        : parsedCustom.regions;

      return {
        ...mapConfig,
        regions: mergedRegions,
        paths: parsedCustom.paths,
      } as MapConfig;
    }
    return mapConfig;
  }, [parsedCustom, customRegions, mapConfig]);

  const effectiveViewBox = parsedCustom?.viewBox || mapConfig.viewBox || '0 0 500 500';

  // For system maps with pre-calculated viewBox, use it directly.
  // For custom maps or legacy maps without viewBox, calculate from rendered paths.
  const [computedViewBox, setComputedViewBox] = useState<string | null>(null);

  // Use config viewBox if available, otherwise fall back to computed
  const autoViewBox = mapConfig.viewBox && !parsedCustom
    ? mapConfig.viewBox
    : (computedViewBox || effectiveViewBox);

  useEffect(() => {
    // Only compute viewBox from DOM if we don't have one from config
    if (mapConfig.viewBox && !parsedCustom) return;
    if (svgRef.current) {
      const bbox = svgRef.current.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const padding = Math.max(bbox.width, bbox.height) * 0.02;
        setComputedViewBox(`${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
      }
    }
  }, [effectiveConfig, effectiveViewBox, mapConfig.viewBox, parsedCustom]);

  // Build region value map from data
  const regionValues = useMemo(() => {
    const map: Record<string, number> = {};
    if (!Array.isArray(data)) return map;
    for (const row of data) {
      const rawRegion = String(row[regionColumn] ?? '');
      const normalized = normalizeRegionName(rawRegion, effectiveConfig);
      if (!normalized) continue;

      const rawValue = row[valueColumn];
      const numValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (isNaN(numValue)) continue;

      // Sum values for same region
      map[normalized] = (map[normalized] ?? 0) + numValue;
    }
    return map;
  }, [data, regionColumn, valueColumn, effectiveConfig]);

  const values = Object.values(regionValues);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

  const handleMouseEnter = useCallback((region: string) => {
    setHoveredRegion(region);
    const value = regionValues[region];
    setTooltip({
      region,
      value: value !== undefined ? value : 0,
      x: 0,
      y: 0,
    });
  }, [regionValues]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (tooltip) {
      const svgRect = e.currentTarget.getBoundingClientRect();
      setTooltip(prev =>
        prev
          ? {
              ...prev,
              x: e.clientX - svgRect.left,
              y: e.clientY - svgRect.top,
            }
          : null
      );
    }
  }, [tooltip]);

  const handleMouseLeave = useCallback(() => {
    setHoveredRegion(null);
    setTooltip(null);
  }, []);

  // Count how many regions matched
  const matchedCount = Object.keys(regionValues).length;
  const totalRegions = effectiveConfig.regions.length;

  // Choose region label based on locale
  const regionLabel = locale === 'es' ? effectiveConfig.regionLabel : effectiveConfig.regionLabelEn;

  return (
    <div className="space-y-3">
      {/* Map title */}
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-emerald-500" />
          {title}
        </div>
      )}

      {/* SVG Map */}
      <div className="relative w-full bg-muted/10 border border-border/30 rounded-lg p-4">
        <svg
          ref={svgRef}
          viewBox={autoViewBox}
          className="w-full h-auto max-h-[450px] mx-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Region paths */}
          {effectiveConfig.regions.map((region) => {
            const path = effectiveConfig.paths[region.name];
            if (!path) return null;

            const value = regionValues[region.name];
            const hasData = value !== undefined;
            const isHovered = hoveredRegion === region.name;

            const fillColor = hasData
              ? getHeatColor(value, minVal, maxVal)
              : 'hsl(160, 12%, 88%)'; // Light emerald tint — visible but clearly "no data"

            // Calculate stroke width relative to viewBox size for consistent appearance
            // For Mercator coords (millions), strokes must be proportionally larger
            const vbParts = autoViewBox.split(' ');
            const vbWidth = vbParts.length >= 3 ? parseFloat(vbParts[2]) : 500;
            const baseStrokeWidth = vbWidth * (isHovered ? 0.003 : 0.001);

            return (
              <path
                key={region.name}
                d={path}
                fill={fillColor}
                stroke={isHovered ? '#059669' : 'hsl(0, 0%, 70%)'}
                strokeWidth={baseStrokeWidth}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => handleMouseEnter(region.name)}
                style={{
                  filter: isHovered ? 'brightness(1.15) drop-shadow(0 1px 3px rgba(0,0,0,0.2))' : 'none',
                  opacity: hasData ? 1 : 0.65,
                }}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 bg-popover border border-border shadow-lg rounded-lg px-3 py-2 text-xs"
            style={{
              left: Math.min(tooltip.x + 12, 280),
              top: Math.max(tooltip.y - 40, 4),
            }}
          >
            <p className="font-semibold text-foreground">{tooltip.region}</p>
            <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
              {tooltip.value > 0 ? formatValue(tooltip.value) : t('noData')}
            </p>
          </div>
        )}
      </div>

      {/* Color scale legend */}
      <div className="flex items-center gap-3 px-2">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {formatValue(minVal)}
        </span>
        <div className="flex-1 h-3 rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(to right, ${getHeatColor(minVal, minVal, maxVal)}, ${getHeatColor(maxVal, minVal, maxVal)})`,
          }}
        />
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {formatValue(maxVal)}
        </span>
      </div>

      {/* Region match info */}
      <p className="text-[10px] text-muted-foreground text-center">
        {t('regionsWithData', { matched: String(matchedCount), total: String(totalRegions), regionLabel })}
      </p>
    </div>
  );
}
