'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { drawPath, stateCode } from '@react-map/dominican-republic/src/constants';

// ============================================================
// Province name normalization
// ============================================================

/** All 32 provinces/regions of the Dominican Republic */
export const DR_PROVINCES = stateCode as readonly string[];

export type DRProvince = (typeof DR_PROVINCES)[number];

/**
 * Mapping from common alternative names/abbreviations to the standardized province name.
 * Handles accents removal, abbreviations, and common misspellings.
 * Note: The package uses "La Estrelleta" for "Elías Piña"
 */
const PROVINCE_ALIASES: Record<string, string> = {
  // Distrito Nacional
  'distrito nacional': 'Distrito Nacional',
  'dn': 'Distrito Nacional',
  'd.n.': 'Distrito Nacional',
  'santo domingo (dn)': 'Distrito Nacional',
  'santo domingo dn': 'Distrito Nacional',
  'capital': 'Distrito Nacional',
  'santo domingo (distrito nacional)': 'Distrito Nacional',
  'distrito nacional (santo domingo)': 'Distrito Nacional',

  // Santo Domingo province (separate from DN)
  'santo domingo': 'Santo Domingo',
  'santo domingo (provincia)': 'Santo Domingo',
  'santo domingo provincia': 'Santo Domingo',

  // La Estrelleta = Elías Piña (the package uses the old name)
  'elías piña': 'La Estrelleta',
  'elias pina': 'La Estrelleta',
  'e.p.': 'La Estrelleta',

  // Abbreviations
  'm.n.': 'Monseñor Nouel',
  'monsenor nouel': 'Monseñor Nouel',
  'mons. nouel': 'Monseñor Nouel',
  'h.m.': 'Hermanas Mirabal',
  'salcedo': 'Hermanas Mirabal', // Old name
  'm.t.s.': 'María Trinidad Sánchez',
  'maria trinidad sanchez': 'María Trinidad Sánchez',
  'mts': 'María Trinidad Sánchez',
  's.r.': 'Santiago Rodríguez',
  'santiago rodriguez': 'Santiago Rodríguez',
  's.j.o.': 'San José de Ocoa',
  'san jose de ocoa': 'San José de Ocoa',
  'sjo': 'San José de Ocoa',
  's.p.m.': 'San Pedro de Macorís',
  'san pedro de macoris': 'San Pedro de Macorís',
  'san pedro macoris': 'San Pedro de Macorís',
  'la altagracia': 'La Altagracia',
  'la romana': 'La Romana',
  'la vega': 'La Vega',
  'hato mayor': 'Hato Mayor',
  'hato mayor del rey': 'Hato Mayor',
  'monte cristi': 'Monte Cristi',
  'monte cristo': 'Monte Cristi',
  'monte plata': 'Monte Plata',
  'el seibo': 'El Seibo',
  'el seybo': 'El Seibo',
  'samaná': 'Samaná',
  'samana': 'Samaná',
  'sánchez ramírez': 'Sánchez Ramírez',
  'sanchez ramirez': 'Sánchez Ramírez',
  'san cristóbal': 'San Cristóbal',
  'san cristobal': 'San Cristóbal',
  'san juan': 'San Juan',
  'duarte': 'Duarte',
  'azua': 'Azua',
  'azua de compostela': 'Azua',
  'baoruco': 'Baoruco',
  'barahona': 'Barahona',
  'dajabón': 'Dajabón',
  'dajabon': 'Dajabón',
  'independencia': 'Independencia',
  'pedernales': 'Pedernales',
  'peravia': 'Peravia',
  'baní': 'Peravia',
  'bani': 'Peravia',
  'puerto plata': 'Puerto Plata',
  'santiago': 'Santiago',
  'valverde': 'Valverde',
  'mao': 'Valverde',
  'espalliat': 'Espaillat',
};

/**
 * Normalize a province name to the standard form used in the SVG map.
 * Handles: lowercase, accents, abbreviations, old names, capital cities.
 */
export function normalizeProvinceName(input: string): DRProvince | null {
  if (!input) return null;

  const trimmed = input.trim();

  // 1. Direct match (case-sensitive)
  if (stateCode.includes(trimmed)) return trimmed as DRProvince;

  // 2. Case-insensitive direct match
  const lower = trimmed.toLowerCase();
  const directMatch = stateCode.find(p => p.toLowerCase() === lower);
  if (directMatch) return directMatch;

  // 3. Alias lookup
  if (PROVINCE_ALIASES[lower]) return PROVINCE_ALIASES[lower];

  // 4. Remove accents and try again
  const noAccents = lower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const aliasNoAccents = PROVINCE_ALIASES[noAccents];
  if (aliasNoAccents) return aliasNoAccents;

  const directNoAccents = stateCode.find(
    p => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === noAccents
  );
  if (directNoAccents) return directNoAccents;

  // 5. Partial match
  const partialMatch = stateCode.find(
    p => p.toLowerCase().includes(lower) || lower.includes(p.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  return null;
}

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
// DR Heat Map Component
// ============================================================

interface DRMapProps {
  data: Array<Record<string, unknown>>;
  provinceColumn: string;
  valueColumn: string;
  title?: string;
}

interface TooltipInfo {
  province: string;
  value: number;
  x: number;
  y: number;
}

export function DRHeatMap({ data, provinceColumn, valueColumn, title }: DRMapProps) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
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

  // Build province value map from data
  const provinceValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of data) {
      const rawProvince = String(row[provinceColumn] ?? '');
      const normalized = normalizeProvinceName(rawProvince);
      if (!normalized) continue;

      const rawValue = row[valueColumn];
      const numValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (isNaN(numValue)) continue;

      // Sum values for same province
      map[normalized] = (map[normalized] ?? 0) + numValue;
    }
    return map;
  }, [data, provinceColumn, valueColumn]);

  const values = Object.values(provinceValues);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

  const handleMouseEnter = (province: string) => {
    setHoveredProvince(province);
    if (provinceValues[province] !== undefined) {
      setTooltip({
        province,
        value: provinceValues[province],
        x: 0,
        y: 0,
      });
    } else {
      setTooltip({
        province,
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
    setHoveredProvince(null);
    setTooltip(null);
  };

  // Count how many provinces matched
  const matchedCount = Object.keys(provinceValues).length;
  const totalProvinces = stateCode.length;

  // Build cityColors map for the react-map component
  const cityColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const province of stateCode) {
      const value = provinceValues[province];
      if (value !== undefined) {
        colors[province] = getHeatColor(value, minVal, maxVal);
      }
    }
    return colors;
  }, [provinceValues, minVal, maxVal]);

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
          {/* Province paths */}
          {stateCode.map((province) => {
            const path = drawPath[province as keyof typeof drawPath];
            if (!path) return null;

            const value = provinceValues[province];
            const hasData = value !== undefined;
            const isHovered = hoveredProvince === province;

            const fillColor = hasData
              ? getHeatColor(value, minVal, maxVal)
              : 'hsl(0, 0%, 92%)';

            return (
              <path
                key={province}
                d={path}
                fill={fillColor}
                stroke={isHovered ? '#059669' : 'hsl(0, 0%, 70%)'}
                strokeWidth={isHovered ? 1.5 : 0.5}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => handleMouseEnter(province)}
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
            <p className="font-semibold text-foreground">{tooltip.province}</p>
            <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
              {tooltip.value > 0 ? formatValue(tooltip.value) : 'Sin datos'}
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

      {/* Province match info */}
      <p className="text-[10px] text-muted-foreground text-center">
        {matchedCount} de {totalProvinces} provincias con datos
      </p>
    </div>
  );
}

/**
 * Check if data looks geographic (has province-like values).
 * Returns the province column name if found, null otherwise.
 */
export function detectGeographicColumn(
  data: Array<Record<string, unknown>>,
  columns: string[]
): { provinceColumn: string; valueColumn: string } | null {
  if (!data || data.length === 0) return null;

  // Keywords that suggest a geographic column
  const geoKeywords = [
    'province', 'provincia', 'state', 'estado', 'region', 'región',
    'department', 'departamento', 'municipality', 'municipio',
    'location', 'ubicación', 'city', 'ciudad', 'territory',
  ];

  let provinceColumn: string | null = null;

  // 1. Check column names for geographic keywords
  for (const col of columns) {
    const lower = col.toLowerCase();
    if (geoKeywords.some(kw => lower.includes(kw))) {
      provinceColumn = col;
      break;
    }
  }

  // 2. If no column name match, check column values to see if they contain DR province names
  if (!provinceColumn) {
    for (const col of columns) {
      const values = data.slice(0, 20).map(row => String(row[col] ?? '').toLowerCase());
      const matchCount = values.filter(v =>
        stateCode.some(p => p.toLowerCase() === v) ||
        Object.keys(PROVINCE_ALIASES).includes(v)
      ).length;

      // If more than 30% of values match a DR province, it's likely geographic
      if (matchCount > values.length * 0.3) {
        provinceColumn = col;
        break;
      }
    }
  }

  if (!provinceColumn) return null;

  // Find a numeric column for the value
  const valueColumn = columns.find(col => {
    if (col === provinceColumn) return false;
    return data.slice(0, 10).some(row => {
      const v = row[col];
      return typeof v === 'number' || (!isNaN(Number(v)) && v !== null && v !== '');
    });
  });

  if (!valueColumn) return null;

  return { provinceColumn, valueColumn };
}
