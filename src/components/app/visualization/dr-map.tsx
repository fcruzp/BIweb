'use client';

import { useMemo } from 'react';
import { stateCode } from '@/lib/dr-map-constants';
import { GeoMap } from '@/components/app/visualization/geo-map';
import { getMapConfig, detectCountryFromData, normalizeRegionName, detectGeographicColumn as registryDetectGeographicColumn } from '@/lib/map-registry';
import type { MapConfig } from '@/lib/map-registry';

// ============================================================
// Backward-compatible types & constants
// ============================================================

/** All 32 provinces/regions of the Dominican Republic */
export const DR_PROVINCES = stateCode as readonly string[];

export type DRProvince = (typeof DR_PROVINCES)[number];

/**
 * Normalize a province name to the standard form used in the SVG map.
 * Handles: lowercase, accents, abbreviations, old names, capital cities.
 *
 * @deprecated Use `normalizeRegionName(input, config)` from `@/lib/map-registry` instead.
 */
export function normalizeProvinceName(input: string): DRProvince | null {
  const config = getMapConfig('DO');
  if (!config) return null;
  const result = normalizeRegionName(input, config);
  return result as DRProvince | null;
}

// ============================================================
// DRHeatMap — backward-compatible wrapper around GeoMap
// ============================================================

interface DRMapProps {
  data: Array<Record<string, unknown>>;
  provinceColumn: string;
  valueColumn: string;
  title?: string;
}

/**
 * Dominican Republic heat map component.
 *
 * This is a backward-compatible wrapper around the generic `GeoMap` component.
 * It auto-detects the country from data or defaults to "DO" (Dominican Republic).
 *
 * For new code, prefer using `GeoMap` directly with a `mapConfig` prop.
 */
export function DRHeatMap({ data, provinceColumn, valueColumn, title }: DRMapProps) {
  // Auto-detect country or default to "DO"
  const mapConfig = useMemo<MapConfig>(() => {
    // Try to detect country from data
    if (data && data.length > 0) {
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      const detection = detectCountryFromData(data, columns);
      if (detection) {
        const detectedConfig = getMapConfig(detection.countryCode);
        if (detectedConfig) return detectedConfig;
      }
    }

    // Default to Dominican Republic
    const drConfig = getMapConfig('DO');
    if (!drConfig) {
      throw new Error('DR map config not found in registry');
    }
    return drConfig;
  }, [data]);

  return (
    <GeoMap
      data={data}
      regionColumn={provinceColumn}
      valueColumn={valueColumn}
      title={title}
      mapConfig={mapConfig}
    />
  );
}

/**
 * Check if data looks geographic (has province-like values).
 * Returns the province column name if found, null otherwise.
 *
 * @deprecated Use `detectGeographicColumn` from `@/lib/map-registry` instead.
 */
export { registryDetectGeographicColumn as detectGeographicColumn };

// Re-export GeoMap and MapConfig for direct usage
export { GeoMap } from '@/components/app/visualization/geo-map';
export type { MapConfig } from '@/lib/map-registry';
