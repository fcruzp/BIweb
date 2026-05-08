'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

// ============================================================
// Province name normalization
// ============================================================

/** All 32 provinces/regions of the Dominican Republic */
export const DR_PROVINCES = [
  'Distrito Nacional',
  'Azua',
  'Baoruco',
  'Barahona',
  'Dajabón',
  'Duarte',
  'Elías Piña',
  'El Seibo',
  'Espaillat',
  'Hato Mayor',
  'Hermanas Mirabal',
  'Independencia',
  'La Altagracia',
  'La Romana',
  'La Vega',
  'María Trinidad Sánchez',
  'Monseñor Nouel',
  'Monte Cristi',
  'Monte Plata',
  'Pedernales',
  'Peravia',
  'Puerto Plata',
  'Samaná',
  'Sánchez Ramírez',
  'San Cristóbal',
  'San José de Ocoa',
  'San Juan',
  'San Pedro de Macorís',
  'Santiago',
  'Santiago Rodríguez',
  'Santo Domingo',
  'Valverde',
] as const;

export type DRProvince = (typeof DR_PROVINCES)[number];

/**
 * Mapping from common alternative names/abbreviations to the standardized province name.
 * Handles accents removal, abbreviations, and common misspellings.
 */
const PROVINCE_ALIASES: Record<string, DRProvince> = {
  // Distrito Nacional
  'distrito nacional': 'Distrito Nacional',
  'dn': 'Distrito Nacional',
  'd.n.': 'Distrito Nacional',
  'santo domingo (dn)': 'Distrito Nacional',
  'santo domingo dn': 'Distrito Nacional',
  'capital': 'Distrito Nacional',
  'santo domingo (distrito nacional)': 'Distrito Nacional',

  // Santo Domingo province (separate from DN)
  'santo domingo': 'Santo Domingo',
  'santo domingo (provincia)': 'Santo Domingo',
  'santo domingo provincia': 'Santo Domingo',

  // Abbreviations
  'm.n.': 'Monseñor Nouel',
  'monsenor nouel': 'Monseñor Nouel',
  'mons. nouel': 'Monseñor Nouel',
  'e.p.': 'Elías Piña',
  'elias pina': 'Elías Piña',
  'h.m.': 'Hermanas Mirabal',
  'hermanas mirabal': 'Hermanas Mirabal',
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
  'espalliat': 'Espaillat',
  'independencia': 'Independencia',
  'pedernales': 'Pedernales',
  'peravia': 'Peravia',
  'baní': 'Peravia', // Capital of Peravia
  'bani': 'Peravia',
  'puerto plata': 'Puerto Plata',
  'santiago': 'Santiago',
  'valverde': 'Valverde',
  'mao': 'Valverde', // Capital of Valverde
};

/**
 * Normalize a province name to the standard form used in the SVG map.
 * Handles: lowercase, accents, abbreviations, old names, capital cities.
 */
export function normalizeProvinceName(input: string): DRProvince | null {
  if (!input) return null;

  const trimmed = input.trim();

  // 1. Direct match (case-sensitive)
  if (DR_PROVINCES.includes(trimmed as DRProvince)) {
    return trimmed as DRProvince;
  }

  // 2. Case-insensitive direct match
  const lower = trimmed.toLowerCase();
  const directMatch = DR_PROVINCES.find(p => p.toLowerCase() === lower);
  if (directMatch) return directMatch;

  // 3. Alias lookup
  if (PROVINCE_ALIASES[lower]) return PROVINCE_ALIASES[lower];

  // 4. Remove accents and try again
  const noAccents = lower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const aliasNoAccents = PROVINCE_ALIASES[noAccents];
  if (aliasNoAccents) return aliasNoAccents;

  const directNoAccents = DR_PROVINCES.find(
    p => p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === noAccents
  );
  if (directNoAccents) return directNoAccents;

  // 5. Partial match - if input is a substring of a province name
  const partialMatch = DR_PROVINCES.find(
    p => p.toLowerCase().includes(lower) || lower.includes(p.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  return null;
}

// ============================================================
// SVG Paths for DR Provinces
// These are simplified paths based on approximate geographic layout
// ============================================================

const PROVINCE_PATHS: Record<DRProvince, string> = {
  'Distrito Nacional': 'M302,248 L310,244 L318,248 L320,256 L316,264 L308,266 L300,260 L298,254 Z',
  'Santo Domingo': 'M296,254 L302,248 L298,254 L300,260 L308,266 L304,274 L296,272 L290,264 L292,258 Z',
  'San Cristóbal': 'M282,260 L292,258 L290,264 L296,272 L292,280 L284,282 L276,274 L278,266 Z',
  'Peravia': 'M268,266 L278,266 L276,274 L284,282 L280,290 L270,290 L262,282 L264,272 Z',
  'San José de Ocoa': 'M256,260 L268,266 L264,272 L262,282 L252,280 L246,272 L250,264 Z',
  'Azua': 'M240,264 L250,264 L246,272 L252,280 L248,290 L238,290 L232,282 L234,272 Z',
  'Barahona': 'M222,274 L234,272 L232,282 L238,290 L234,302 L224,306 L216,298 L218,284 Z',
  'Pedernales': 'M200,292 L218,284 L216,298 L224,306 L220,320 L208,326 L196,320 L194,306 Z',
  'Independencia': 'M210,256 L222,256 L222,274 L218,284 L200,292 L194,306 L186,300 L188,276 L196,264 Z',
  'Baoruco': 'M210,240 L222,240 L222,256 L210,256 L196,264 L192,254 L200,244 Z',
  'Elías Piña': 'M198,220 L210,220 L210,240 L200,244 L192,254 L180,252 L176,240 L186,228 Z',
  'San Juan': 'M198,196 L210,196 L210,220 L198,220 L186,228 L176,240 L166,236 L168,220 L180,206 Z',
  'Santiago Rodríguez': 'M172,180 L186,178 L186,196 L180,206 L168,220 L156,216 L158,200 L164,190 Z',
  'Dajabón': 'M164,162 L178,160 L178,172 L186,178 L172,180 L164,190 L154,188 L156,174 Z',
  'Monte Cristi': 'M164,130 L178,130 L178,148 L178,160 L164,162 L156,174 L146,170 L148,154 L154,140 Z',
  'Valverde': 'M186,130 L200,130 L200,148 L194,158 L178,160 L178,148 L178,130 Z',
  'Santiago': 'M200,162 L218,162 L218,180 L210,196 L198,196 L180,206 L186,196 L186,178 L178,172 L186,170 Z',
  'La Vega': 'M230,154 L248,154 L248,172 L240,182 L230,190 L218,186 L210,196 L218,180 L218,162 L226,158 Z',
  'Espaillat': 'M222,126 L240,126 L240,140 L248,148 L248,154 L230,154 L226,158 L218,162 L200,162 L200,148 L210,142 Z',
  'Puerto Plata': 'M202,100 L222,100 L222,126 L210,142 L200,148 L200,130 L186,130 L178,148 L170,140 L176,120 L190,106 Z',
  'Sánchez Ramírez': 'M254,172 L270,172 L270,190 L260,198 L248,196 L240,182 L248,172 Z',
  'Duarte': 'M270,172 L290,172 L290,190 L280,198 L270,200 L260,198 L270,190 Z',
  'María Trinidad Sánchez': 'M290,154 L310,154 L310,172 L290,172 L290,190 L280,198 L274,192 L276,176 L286,168 Z',
  'Samaná': 'M312,140 L330,140 L340,150 L338,166 L330,176 L316,174 L310,172 L310,154 Z',
  'Hermanas Mirabal': 'M268,146 L290,146 L290,154 L286,168 L276,176 L270,172 L254,172 L248,164 L254,156 Z',
  'Monseñor Nouel': 'M248,190 L260,198 L270,200 L266,210 L256,214 L244,208 L240,198 Z',
  'Monte Plata': 'M278,210 L290,206 L302,210 L304,222 L296,230 L284,230 L276,224 Z',
  'Hato Mayor': 'M302,196 L316,194 L326,200 L328,214 L320,222 L304,222 L302,210 Z',
  'El Seibo': 'M326,186 L340,184 L350,192 L352,208 L340,214 L328,214 L326,200 Z',
  'San Pedro de Macorís': 'M310,230 L324,228 L334,234 L334,248 L324,254 L310,254 L304,244 Z',
  'La Romana': 'M334,234 L350,232 L360,240 L358,254 L348,260 L334,258 L334,248 Z',
  'La Altagracia': 'M352,212 L368,208 L380,216 L382,232 L374,242 L360,240 L350,232 L350,216 Z',
};

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

      // Sum values for same province (in case of multiple entries)
      map[normalized] = (map[normalized] ?? 0) + numValue;
    }
    return map;
  }, [data, provinceColumn, valueColumn]);

  const values = Object.values(provinceValues);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

  const handleMouseEnter = (province: DRProvince) => {
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
  const totalProvinces = DR_PROVINCES.length;

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
          viewBox="0 0 420 360"
          className="w-full h-auto max-h-[400px] mx-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Background - Caribbean Sea */}
          <rect x="0" y="0" width="420" height="360" fill="transparent" />

          {/* Province paths */}
          {DR_PROVINCES.map(province => {
            const path = PROVINCE_PATHS[province];
            if (!path) return null;

            const value = provinceValues[province];
            const hasData = value !== undefined;
            const isHovered = hoveredProvince === province;

            const fillColor = hasData
              ? getHeatColor(value, minVal, maxVal)
              : 'hsl(0, 0%, 92%)'; // Light gray for provinces without data

            return (
              <path
                key={province}
                d={path}
                fill={fillColor}
                stroke={isHovered ? '#059669' : 'hsl(0, 0%, 70%)'}
                strokeWidth={isHovered ? 2 : 0.75}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => handleMouseEnter(province)}
                style={{
                  filter: isHovered ? 'brightness(1.1) drop-shadow(0 1px 2px rgba(0,0,0,0.15))' : 'none',
                  opacity: hasData ? 1 : 0.5,
                }}
              />
            );
          })}

          {/* Province labels for larger provinces */}
          {Object.entries(PROVINCE_PATHS).map(([province, path]) => {
            // Calculate centroid from path for label positioning
            const coords = path.match(/[\d.]+/g)?.map(Number) ?? [];
            if (coords.length < 2) return null;
            let cx = 0, cy = 0, count = 0;
            for (let i = 0; i < coords.length - 1; i += 2) {
              cx += coords[i];
              cy += coords[i + 1];
              count++;
            }
            cx /= count;
            cy /= count;

            // Only show labels for provinces with data and if there aren't too many
            if (!provinceValues[province as DRProvince]) return null;

            return (
              <text
                key={`label-${province}`}
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none fill-foreground/70"
                fontSize="6"
                fontWeight="500"
              >
                {province.length > 10 ? province.split(' ').map(w => w[0]).join('') : province}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 bg-popover border border-border shadow-lg rounded-lg px-3 py-2 text-xs"
            style={{
              left: Math.min(tooltip.x + 12, 300),
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
        DR_PROVINCES.some(p => p.toLowerCase() === v) ||
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
