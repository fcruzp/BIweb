// ============================================================
// DataMind BI — Generic Map Registry
// ============================================================
// Provides types, a registry of country map configs, and helpers
// for auto-detecting which country a dataset refers to.

import { drawPath, stateCode } from '@/lib/dr-map-constants';
import { US_REGIONS, US_PATHS, US_VIEWBOX } from '@/lib/maps/us-map';
import { MX_REGIONS, MX_PATHS, MX_VIEWBOX } from '@/lib/maps/mx-map';
import { CO_REGIONS, CO_PATHS, CO_VIEWBOX } from '@/lib/maps/co-map';
import { AR_REGIONS, AR_PATHS, AR_VIEWBOX } from '@/lib/maps/ar-map';
import { CL_REGIONS, CL_PATHS, CL_VIEWBOX } from '@/lib/maps/cl-map';
import { PE_REGIONS, PE_PATHS, PE_VIEWBOX } from '@/lib/maps/pe-map';
import { BR_REGIONS, BR_PATHS, BR_VIEWBOX } from '@/lib/maps/br-map';
import { ES_REGIONS, ES_PATHS, ES_VIEWBOX } from '@/lib/maps/es-map';

// ── Types ────────────────────────────────────────────────────

export interface MapRegion {
  /** Standard name used as key in paths: "Distrito Nacional" */
  name: string;
  /** Optional ISO code: "DO-01" */
  id?: string;
  /** Alternative names / abbreviations / common misspellings */
  aliases: string[];
}

export interface MapConfig {
  /** ISO 3166-1 alpha-2 country code: "DO", "US", "MX" */
  countryCode: string;
  /** Display name in Spanish: "Rep. Dominicana" */
  name: string;
  /** Display name in English: "Dominican Republic" */
  nameEn: string;
  /** Region label in Spanish: "provincias" / "estados" / "departamentos" */
  regionLabel: string;
  /** Region label in English: "provinces" / "states" / "departments" */
  regionLabelEn: string;
  /** Region definitions with aliases */
  regions: MapRegion[];
  /** Region name → SVG path data */
  paths: Record<string, string>;
  /** SVG viewBox string (e.g., "0 0 500 500") */
  viewBox?: string;
}

// ── DR Map Config ────────────────────────────────────────────

const DR_REGIONS: MapRegion[] = [
  { name: 'Distrito Nacional', aliases: ['distrito nacional', 'dn', 'd.n.', 'santo domingo (dn)', 'santo domingo dn', 'capital', 'santo domingo (distrito nacional)', 'distrito nacional (santo domingo)'] },
  { name: 'Azua', aliases: ['azua de compostela'] },
  { name: 'Baoruco', aliases: [] },
  { name: 'Barahona', aliases: [] },
  { name: 'Dajabón', aliases: ['dajabon'] },
  { name: 'Duarte', aliases: [] },
  { name: 'El Seibo', aliases: ['el seybo'] },
  { name: 'Espaillat', aliases: ['espalliat'] },
  { name: 'Hato Mayor', aliases: ['hato mayor del rey'] },
  { name: 'Independencia', aliases: [] },
  { name: 'La Altagracia', aliases: [] },
  { name: 'La Estrelleta', aliases: ['elías piña', 'elias pina', 'e.p.'] },
  { name: 'La Romana', aliases: [] },
  { name: 'La Vega', aliases: [] },
  { name: 'María Trinidad Sánchez', aliases: ['m.t.s.', 'maria trinidad sanchez', 'mts'] },
  { name: 'Monseñor Nouel', aliases: ['m.n.', 'monsenor nouel', 'mons. nouel'] },
  { name: 'Monte Cristi', aliases: ['monte cristi', 'monte cristo'] },
  { name: 'Monte Plata', aliases: [] },
  { name: 'Pedernales', aliases: [] },
  { name: 'Peravia', aliases: ['baní', 'bani'] },
  { name: 'Puerto Plata', aliases: [] },
  { name: 'Hermanas Mirabal', aliases: ['h.m.', 'salcedo'] },
  { name: 'Samaná', aliases: ['samana'] },
  { name: 'San Cristóbal', aliases: ['san cristobal'] },
  { name: 'San José de Ocoa', aliases: ['s.j.o.', 'san jose de ocoa', 'sjo'] },
  { name: 'San Juan', aliases: [] },
  { name: 'San Pedro de Macorís', aliases: ['s.p.m.', 'san pedro de macoris', 'san pedro macoris'] },
  { name: 'Sánchez Ramírez', aliases: ['sanchez ramirez'] },
  { name: 'Santiago', aliases: [] },
  { name: 'Santiago Rodríguez', aliases: ['s.r.', 'santiago rodriguez'] },
  { name: 'Santo Domingo', aliases: ['santo domingo (provincia)', 'santo domingo provincia'] },
  { name: 'Valverde', aliases: ['mao'] },
];

const DR_PATHS: Record<string, string> = drawPath as Record<string, string>;

const DR_MAP_CONFIG: MapConfig = {
  countryCode: 'DO',
  name: 'Rep. Dominicana',
  nameEn: 'Dominican Republic',
  regionLabel: 'provincias',
  regionLabelEn: 'provinces',
  regions: DR_REGIONS,
  paths: DR_PATHS,
  viewBox: '-25 -25 730 585',
};

// ── Registry ─────────────────────────────────────────────────

export const MAP_REGISTRY: Record<string, MapConfig> = {
  DO: DR_MAP_CONFIG,
  US: {
    countryCode: 'US',
    name: 'Estados Unidos',
    nameEn: 'United States',
    regionLabel: 'estados',
    regionLabelEn: 'states',
    regions: US_REGIONS,
    paths: US_PATHS,
    viewBox: US_VIEWBOX,
  },
  MX: {
    countryCode: 'MX',
    name: 'México',
    nameEn: 'Mexico',
    regionLabel: 'estados',
    regionLabelEn: 'states',
    regions: MX_REGIONS,
    paths: MX_PATHS,
    viewBox: MX_VIEWBOX,
  },
  CO: {
    countryCode: 'CO',
    name: 'Colombia',
    nameEn: 'Colombia',
    regionLabel: 'departamentos',
    regionLabelEn: 'departments',
    regions: CO_REGIONS,
    paths: CO_PATHS,
    viewBox: CO_VIEWBOX,
  },
  AR: {
    countryCode: 'AR',
    name: 'Argentina',
    nameEn: 'Argentina',
    regionLabel: 'provincias',
    regionLabelEn: 'provinces',
    regions: AR_REGIONS,
    paths: AR_PATHS,
    viewBox: AR_VIEWBOX,
  },
  CL: {
    countryCode: 'CL',
    name: 'Chile',
    nameEn: 'Chile',
    regionLabel: 'regiones',
    regionLabelEn: 'regions',
    regions: CL_REGIONS,
    paths: CL_PATHS,
    viewBox: CL_VIEWBOX,
  },
  PE: {
    countryCode: 'PE',
    name: 'Perú',
    nameEn: 'Peru',
    regionLabel: 'departamentos',
    regionLabelEn: 'departments',
    regions: PE_REGIONS,
    paths: PE_PATHS,
    viewBox: PE_VIEWBOX,
  },
  BR: {
    countryCode: 'BR',
    name: 'Brasil',
    nameEn: 'Brazil',
    regionLabel: 'estados',
    regionLabelEn: 'states',
    regions: BR_REGIONS,
    paths: BR_PATHS,
    viewBox: BR_VIEWBOX,
  },
  ES: {
    countryCode: 'ES',
    name: 'España',
    nameEn: 'Spain',
    regionLabel: 'comunidades autónomas',
    regionLabelEn: 'autonomous communities',
    regions: ES_REGIONS,
    paths: ES_PATHS,
    viewBox: ES_VIEWBOX,
  },
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Retrieve a MapConfig by country code.
 * Returns null if the country is not registered.
 */
export function getMapConfig(countryCode: string): MapConfig | null {
  return MAP_REGISTRY[countryCode.toUpperCase()] ?? null;
}

/**
 * Normalize a region name against a MapConfig.
 *
 * Resolution order:
 * 1. Direct match (case-sensitive)
 * 2. Case-insensitive direct match
 * 3. Alias lookup (lowercase)
 * 4. Remove accents and try again (direct + alias)
 * 5. Partial match as last resort
 */
export function normalizeRegionName(input: string, config: MapConfig): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  const regionNames = config.regions.map(r => r.name);

  // 1. Direct match (case-sensitive)
  if (regionNames.includes(trimmed)) return trimmed;

  // 2. Case-insensitive direct match
  const lower = trimmed.toLowerCase();
  const directMatch = regionNames.find(r => r.toLowerCase() === lower);
  if (directMatch) return directMatch;

  // 3. Alias lookup
  for (const region of config.regions) {
    if (region.aliases.includes(lower)) return region.name;
  }

  // 4. Remove accents and try again
  const noAccents = lower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const region of config.regions) {
    if (region.aliases.some(a => a.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === noAccents)) {
      return region.name;
    }
  }

  const directNoAccents = regionNames.find(
    r => r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === noAccents
  );
  if (directNoAccents) return directNoAccents;

  // 5. Partial match
  const partialMatch = regionNames.find(
    r => r.toLowerCase().includes(lower) || lower.includes(r.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  return null;
}

/**
 * Detect which country a dataset refers to by checking data values
 * against ALL registered countries' region names and aliases.
 *
 * Returns the best match with countryCode, the detected region column,
 * and a confidence score (0–1).
 */
export function detectCountryFromData(
  data: Array<Record<string, unknown>>,
  columns: string[]
): { countryCode: string; regionColumn: string; confidence: number } | null {
  if (!data || data.length === 0) return null;

  // Keywords that suggest a geographic column
  const geoKeywords = [
    'province', 'provincia', 'state', 'estado', 'region', 'región',
    'department', 'departamento', 'municipality', 'municipio',
    'location', 'ubicación', 'city', 'ciudad', 'territory',
  ];

  // For each column, try matching against each country
  let bestResult: { countryCode: string; regionColumn: string; confidence: number } | null = null;

  for (const col of columns) {
    const values = data.slice(0, 20).map(row => String(row[col] ?? '').toLowerCase().trim());

    for (const [countryCode, config] of Object.entries(MAP_REGISTRY)) {
      // Build a lookup set of all region names + aliases (lowercased)
      const allRegionIdentifiers = new Set<string>();
      for (const region of config.regions) {
        allRegionIdentifiers.add(region.name.toLowerCase());
        for (const alias of region.aliases) {
          allRegionIdentifiers.add(alias.toLowerCase());
        }
      }

      // Count how many values match
      const matchCount = values.filter(v => allRegionIdentifiers.has(v)).length;
      const confidence = matchCount / values.length;

      if (confidence > 0.3 && (!bestResult || confidence > bestResult.confidence)) {
        bestResult = { countryCode, regionColumn: col, confidence };
      }
    }

    // Also check column name for geographic keywords (lower priority)
    const lower = col.toLowerCase();
    if (geoKeywords.some(kw => lower.includes(kw)) && !bestResult) {
      // If no data-value match yet, try a keyword-based detection
      for (const [countryCode, config] of Object.entries(MAP_REGISTRY)) {
        const allRegionIdentifiers = new Set<string>();
        for (const region of config.regions) {
          allRegionIdentifiers.add(region.name.toLowerCase());
          for (const alias of region.aliases) {
            allRegionIdentifiers.add(alias.toLowerCase());
          }
        }
        const matchCount = values.filter(v => allRegionIdentifiers.has(v)).length;
        const confidence = matchCount / values.length;
        if (confidence > 0.1 && (!bestResult || confidence > bestResult.confidence)) {
          bestResult = { countryCode, regionColumn: col, confidence };
        }
      }
    }
  }

  return bestResult;
}

/**
 * Detect geographic column in data (backward-compatible helper).
 * Returns the province/region column and value column names.
 */
export function detectGeographicColumn(
  data: Array<Record<string, unknown>>,
  columns: string[]
): { provinceColumn: string; valueColumn: string } | null {
  if (!data || data.length === 0) return null;

  // Try the new detectCountryFromData first
  const detection = detectCountryFromData(data, columns);
  if (detection) {
    const provinceColumn = detection.regionColumn;

    // Find a numeric column for the value
    const valueColumn = columns.find(col => {
      if (col === provinceColumn) return false;
      return data.slice(0, 10).some(row => {
        const v = row[col];
        return typeof v === 'number' || (!isNaN(Number(v)) && v !== null && v !== '');
      });
    });

    if (valueColumn) return { provinceColumn, valueColumn };
  }

  // Fallback: check column names for geographic keywords (legacy DR-only logic)
  const geoKeywords = [
    'province', 'provincia', 'state', 'estado', 'region', 'región',
    'department', 'departamento', 'municipality', 'municipio',
    'location', 'ubicación', 'city', 'ciudad', 'territory',
  ];

  let provinceColumn: string | null = null;

  for (const col of columns) {
    const lower = col.toLowerCase();
    if (geoKeywords.some(kw => lower.includes(kw))) {
      provinceColumn = col;
      break;
    }
  }

  // If no column name match, check column values against DR regions
  if (!provinceColumn) {
    const config = getMapConfig('DO');
    if (config) {
      for (const col of columns) {
        const values = data.slice(0, 20).map(row => String(row[col] ?? '').toLowerCase().trim());
        const allRegionIdentifiers = new Set<string>();
        for (const region of config.regions) {
          allRegionIdentifiers.add(region.name.toLowerCase());
          for (const alias of region.aliases) {
            allRegionIdentifiers.add(alias.toLowerCase());
          }
        }
        const matchCount = values.filter(v => allRegionIdentifiers.has(v)).length;
        if (matchCount > values.length * 0.3) {
          provinceColumn = col;
          break;
        }
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
