/**
 * Heuristic visualization suggestion — NO AI call needed.
 *
 * Replaces the `suggestVisualization()` AI call (~15s) with instant rule-based detection.
 * The geographic/heatmap detection is preserved from the original AI function.
 */

import type { VisualizationConfig } from '@/stores/chat-store';

// ============================================================
// DR Province Detection (kept from original)
// ============================================================

const DR_PROVINCES = [
  'Distrito Nacional', 'Azua', 'Baoruco', 'Barahona', 'Dajabón', 'Duarte',
  'El Seibo', 'Espaillat', 'Hato Mayor', 'Hermanas Mirabal',
  'Independencia', 'La Altagracia', 'La Estrelleta', 'Elías Piña', 'La Romana', 'La Vega',
  'María Trinidad Sánchez', 'Monseñor Nouel', 'Monte Cristi', 'Monte Plata',
  'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'Sánchez Ramírez',
  'San Cristóbal', 'San José de Ocoa', 'San Juan', 'San Pedro de Macorís',
  'Santiago', 'Santiago Rodríguez', 'Santo Domingo', 'Valverde',
];

const GEO_KEYWORDS = [
  'provincia', 'province', 'mapa', 'map', 'geográf', 'geograph',
  'región', 'region', 'heatmap', 'heat map', 'mapa de calor',
  'por provincia', 'by province', 'por región', 'by region',
  'distribución geográfica', 'geographic distribution',
];

const PROVINCE_COL_PATTERNS = [
  'provincia', 'province', 'region', 'región', 'state', 'estado',
  'municipio', 'municipality', 'location', 'ubicación',
];

// ============================================================
// Type helpers
// ============================================================

type CellValue = unknown;

function isNumeric(v: CellValue): boolean {
  return typeof v === 'number' || (typeof v === 'string' && v !== '' && !isNaN(Number(v)));
}

function isDateLike(v: CellValue): boolean {
  if (v instanceof Date) return true;
  if (typeof v !== 'string') return false;
  // ISO date, YYYY-MM-DD, DD/MM/YYYY, etc.
  return /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{2}\/\d{2}\/\d{4}/.test(v);
}

function classifyColumn(
  values: CellValue[]
): 'numeric' | 'date' | 'categorical' | 'empty' {
  if (values.length === 0) return 'empty';

  let numericCount = 0;
  let dateCount = 0;
  const uniqueValues = new Set(values.map((v) => String(v ?? '')));

  for (const v of values) {
    if (isNumeric(v)) numericCount++;
    if (isDateLike(v)) dateCount++;
  }

  // If most values are dates → date
  if (dateCount > values.length * 0.5) return 'date';
  // If most values are numeric → numeric
  if (numericCount > values.length * 0.7) return 'numeric';
  // If few unique values relative to total → categorical
  if (uniqueValues.size <= Math.max(20, values.length * 0.3)) return 'categorical';
  // Fallback
  return 'categorical';
}

// ============================================================
// Main heuristic function
// ============================================================

export function suggestVisualizationHeuristic(
  sqlQuery: string,
  resultData: Array<Record<string, unknown>>,
  naturalQuery: string
): VisualizationConfig {
  const columns = resultData.length > 0 ? Object.keys(resultData[0]) : [];
  const sampleRows = resultData.slice(0, 50);

  // ---- 1. Geographic / Heatmap detection ----
  const lowerQuery = naturalQuery.toLowerCase();
  const isGeoQuery = GEO_KEYWORDS.some((kw) => lowerQuery.includes(kw));

  let detectedProvinceCol: string | null = null;
  let detectedValueCol: string | null = null;

  for (const col of columns) {
    const lowerCol = col.toLowerCase();
    const isLikelyProvinceCol = PROVINCE_COL_PATTERNS.some((p) => lowerCol.includes(p));

    if (isLikelyProvinceCol) {
      const values = sampleRows.map((r) => String(r[col] ?? '').toLowerCase().trim());
      const matchCount = values.filter((v) =>
        DR_PROVINCES.some((p) => p.toLowerCase() === v)
      ).length;
      if (matchCount >= Math.max(2, values.length * 0.25)) {
        detectedProvinceCol = col;
        break;
      }
    }
  }

  // Fallback: detect by values alone
  if (!detectedProvinceCol) {
    for (const col of columns) {
      const values = sampleRows.map((r) => String(r[col] ?? '').toLowerCase().trim());
      const matchCount = values.filter((v) =>
        DR_PROVINCES.some((p) => p.toLowerCase() === v)
      ).length;
      if (matchCount >= Math.max(3, values.length * 0.3)) {
        detectedProvinceCol = col;
        break;
      }
    }
  }

  if (detectedProvinceCol) {
    detectedValueCol =
      columns.find((c) => {
        if (c === detectedProvinceCol) return false;
        return sampleRows.some((r) => isNumeric(r[c]));
      }) || null;
  }

  if ((isGeoQuery || detectedProvinceCol) && detectedProvinceCol && detectedValueCol) {
    return {
      chartType: 'heatmap',
      title: naturalQuery.slice(0, 60),
      description: `Heat map by ${detectedProvinceCol}`,
      provinceColumn: detectedProvinceCol,
      valueColumn: detectedValueCol,
    };
  }

  // ---- 2. Classify all columns ----
  const colTypes = new Map<string, 'numeric' | 'date' | 'categorical' | 'empty'>();
  for (const col of columns) {
    const values = sampleRows.map((r) => r[col]);
    colTypes.set(col, classifyColumn(values));
  }

  const numericCols = columns.filter((c) => colTypes.get(c) === 'numeric');
  const dateCols = columns.filter((c) => colTypes.get(c) === 'date');
  const categoricalCols = columns.filter((c) => colTypes.get(c) === 'categorical');

  // ---- 3. Single row / single metric ----
  if (resultData.length === 1 && numericCols.length >= 1) {
    const metrics = numericCols
      .slice(0, 4)
      .map((col) => {
        const val = resultData[0][col];
        const numVal = typeof val === 'number' ? val : Number(val);
        return { label: col, value: numVal, format: 'number' as const };
      })
      .filter((m) => !isNaN(m.value));

    if (metrics.length > 0) {
      return {
        chartType: 'metric',
        title: naturalQuery.slice(0, 60),
        description: `Key metrics`,
        metrics,
      };
    }
  }

  // ---- 4. Time series (date + numeric) → line chart ----
  if (dateCols.length >= 1 && numericCols.length >= 1) {
    return {
      chartType: 'line',
      title: naturalQuery.slice(0, 60),
      description: `Trend over time`,
      xAxis: dateCols[0],
      yAxis: numericCols.slice(0, 3),
    };
  }

  // ---- 5. Categorical + numeric → bar chart ----
  if (categoricalCols.length >= 1 && numericCols.length >= 1) {
    const catCol = categoricalCols[0];
    const uniqueCats = new Set(sampleRows.map((r) => String(r[catCol] ?? '')));

    // If ≤ 8 categories, could be pie — but bar is usually better
    if (uniqueCats.size <= 8 && numericCols.length === 1) {
      // Check if the question mentions "proporcion", "porcentaje", "distribución"
      const proportionKeywords = ['proporcion', 'proportion', 'porcentaje', 'percentage', 'distribución', 'distribution', 'part', 'share', 'cuánto representa'];
      if (proportionKeywords.some((kw) => lowerQuery.includes(kw))) {
        return {
          chartType: 'pie',
          title: naturalQuery.slice(0, 60),
          description: `Distribution by ${catCol}`,
          xAxis: catCol,
          yAxis: numericCols.slice(0, 1),
        };
      }
    }

    return {
      chartType: 'bar',
      title: naturalQuery.slice(0, 60),
      description: `Comparison by ${catCol}`,
      xAxis: catCol,
      yAxis: numericCols.slice(0, 3),
    };
  }

  // ---- 6. Two numeric columns → scatter ----
  if (numericCols.length >= 2 && resultData.length > 5) {
    return {
      chartType: 'scatter',
      title: naturalQuery.slice(0, 60),
      description: `Correlation between ${numericCols[0]} and ${numericCols[1]}`,
      xAxis: numericCols[0],
      yAxis: [numericCols[1]],
    };
  }

  // ---- 7. Only numeric, multiple rows → area chart ----
  if (numericCols.length >= 2 && resultData.length > 3) {
    return {
      chartType: 'area',
      title: naturalQuery.slice(0, 60),
      description: `Values over entries`,
      xAxis: columns[0],
      yAxis: numericCols.slice(0, 3),
    };
  }

  // ---- 8. Fallback → table ----
  return {
    chartType: 'table',
    title: naturalQuery.slice(0, 60),
    description: 'Data displayed in table format',
  };
}
