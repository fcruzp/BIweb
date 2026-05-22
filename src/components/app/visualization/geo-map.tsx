'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import type { MapConfig } from '@/lib/map-registry';
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
  /** Map configuration (regions, paths, aliases) */
  mapConfig: MapConfig;
}

interface TooltipInfo {
  region: string;
  value: number;
  x: number;
  y: number;
}

export function GeoMap({ data, regionColumn, valueColumn, title, mapConfig }: GeoMapProps) {
  const { t, locale } = useI18n();
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState('0 0 500 500');

  // Calculate auto viewBox from actual path bounds
  useEffect(() => {
    if (svgRef.current) {
      const bbox = svgRef.current.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const padding = 10;
        setViewBox(`${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
      }
    }
  }, []);

  // Build region value map from data
  const regionValues = useMemo(() => {
    const map: Record<string, number> = {};
    if (!Array.isArray(data)) return map;
    for (const row of data) {
      const rawRegion = String(row[regionColumn] ?? '');
      const normalized = normalizeRegionName(rawRegion, mapConfig);
      if (!normalized) continue;

      const rawValue = row[valueColumn];
      const numValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (isNaN(numValue)) continue;

      // Sum values for same region
      map[normalized] = (map[normalized] ?? 0) + numValue;
    }
    return map;
  }, [data, regionColumn, valueColumn, mapConfig]);

  const values = Object.values(regionValues);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

  const handleMouseEnter = (region: string) => {
    setHoveredRegion(region);
    if (regionValues[region] !== undefined) {
      setTooltip({
        region,
        value: regionValues[region],
        x: 0,
        y: 0,
      });
    } else {
      setTooltip({
        region,
        value: 0,
        x: 0,
        y: 0,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
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
  };

  const handleMouseLeave = () => {
    setHoveredRegion(null);
    setTooltip(null);
  };

  // Count how many regions matched
  const matchedCount = Object.keys(regionValues).length;
  const totalRegions = mapConfig.regions.length;

  // Choose region label based on locale
  const regionLabel = locale === 'es' ? mapConfig.regionLabel : mapConfig.regionLabelEn;

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
          viewBox={viewBox}
          className="w-full h-auto max-h-[450px] mx-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Region paths */}
          {mapConfig.regions.map((region) => {
            const path = mapConfig.paths[region.name];
            if (!path) return null;

            const value = regionValues[region.name];
            const hasData = value !== undefined;
            const isHovered = hoveredRegion === region.name;

            const fillColor = hasData
              ? getHeatColor(value, minVal, maxVal)
              : 'hsl(0, 0%, 92%)';

            return (
              <path
                key={region.name}
                d={path}
                fill={fillColor}
                stroke={isHovered ? '#059669' : 'hsl(0, 0%, 70%)'}
                strokeWidth={isHovered ? 1.5 : 0.5}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => handleMouseEnter(region.name)}
                style={{
                  filter: isHovered ? 'brightness(1.15) drop-shadow(0 1px 3px rgba(0,0,0,0.2))' : 'none',
                  opacity: hasData ? 1 : 0.4,
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
