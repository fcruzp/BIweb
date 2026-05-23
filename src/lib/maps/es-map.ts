/**
 * Spain Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 17 Spanish autonomous communities
 * plus the 2 autonomous cities (Ceuta, Melilla).
 * Each region is represented as a rectangle/polygon positioned
 * in a rough geographic arrangement.
 */

import type { MapRegion } from '@/lib/map-registry';

export const ES_REGIONS: MapRegion[] = [
  { name: 'Andalucía', id: 'ES-AN', aliases: ['andalucía', 'andalucia', 'an'] },
  { name: 'Aragón', id: 'ES-AR', aliases: ['aragón', 'aragon', 'ar'] },
  { name: 'Asturias', id: 'ES-AS', aliases: ['asturias', 'principado de asturias', 'as', 'asturies'] },
  { name: 'Baleares', id: 'ES-IB', aliases: ['baleares', 'illes balears', 'islas baleares', 'ib', 'mallorca', 'balears'] },
  { name: 'Canarias', id: 'ES-CN', aliases: ['canarias', 'islas canarias', 'cn', 'canary islands'] },
  { name: 'Cantabria', id: 'ES-CB', aliases: ['cantabria', 'cb'] },
  { name: 'Castilla-La Mancha', id: 'ES-CM', aliases: ['castilla-la mancha', 'castilla la mancha', 'castilla mancha', 'cm', 'clm'] },
  { name: 'Castilla y León', id: 'ES-CL', aliases: ['castilla y león', 'castilla y leon', 'castilla león', 'castilla leon', 'castilla-león', 'castilla-leon', 'cl', 'cyl'] },
  { name: 'Cataluña', id: 'ES-CT', aliases: ['cataluña', 'catalunya', 'catalonia', 'cataluna', 'ct', 'cat', 'catalán', 'catalan'] },
  { name: 'Comunidad Valenciana', id: 'ES-VC', aliases: ['comunidad valenciana', 'comunitat valenciana', 'valencia', 'comunidad de valencia', 'vc', 'cv', 'pais valenciano', 'país valenciano'] },
  { name: 'Extremadura', id: 'ES-EX', aliases: ['extremadura', 'ex'] },
  { name: 'Galicia', id: 'ES-GA', aliases: ['galicia', 'ga', 'galiza'] },
  { name: 'La Rioja', id: 'ES-RI', aliases: ['la rioja', 'rioja', 'ri', 'lo'] },
  { name: 'Comunidad de Madrid', id: 'ES-MD', aliases: ['comunidad de madrid', 'madrid', 'md', 'comunidad madrid'] },
  { name: 'Región de Murcia', id: 'ES-MC', aliases: ['región de murcia', 'region de murcia', 'murcia', 'mc'] },
  { name: 'Navarra', id: 'ES-NC', aliases: ['navarra', 'comunidad foral de navarra', 'nc', 'na', 'nafarroa'] },
  { name: 'País Vasco', id: 'ES-PV', aliases: ['país vasco', 'pais vasco', 'euskadi', 'pv', 'basque country', 'euskal herria', 'vasco'] },
  { name: 'Ceuta', id: 'ES-CE', aliases: ['ceuta', 'ce'] },
  { name: 'Melilla', id: 'ES-ML', aliases: ['melilla', 'ml'] },
];

/**
 * Simplified SVG paths for Spanish autonomous communities.
 * ViewBox: 0 0 700 600
 * Rough geographic layout:
 *   - Northwest: Galicia, Asturias, Cantabria, País Vasco (top-left)
 *   - Northeast: Aragón, Cataluña (top-right)
 *   - Center-north: Castilla y León, La Rioja, Navarra (top-center)
 *   - Center: Comunidad de Madrid, Castilla-La Mancha (center)
 *   - East: Comunidad Valenciana (center-right)
 *   - South: Andalucía, Región de Murcia, Extremadura (bottom)
 *   - Islands: Baleares (right), Canarias (bottom-left inset)
 *   - Cities: Ceuta, Melilla (small, far south)
 */
export const ES_PATHS: Record<string, string> = {
  // ── Northwest ──
  'Galicia': 'M 10 130 L 110 130 L 110 230 L 10 230 Z',
  'Asturias': 'M 115 100 L 200 100 L 200 170 L 115 170 Z',
  'Cantabria': 'M 205 80 L 290 80 L 290 140 L 205 140 Z',
  'País Vasco': 'M 295 80 L 380 80 L 380 140 L 295 140 Z',
  // ── Center-north ──
  'Castilla y León': 'M 115 175 L 290 175 L 290 290 L 115 290 Z',
  'La Rioja': 'M 295 145 L 370 145 L 370 195 L 295 195 Z',
  'Navarra': 'M 375 80 L 450 80 L 450 150 L 375 150 Z',
  // ── Northeast ──
  'Aragón': 'M 375 155 L 470 155 L 470 290 L 375 290 Z',
  'Cataluña': 'M 475 100 L 580 100 L 580 230 L 475 230 Z',
  // ── Center ──
  'Comunidad de Madrid': 'M 295 250 L 370 250 L 370 310 L 295 310 Z',
  'Castilla-La Mancha': 'M 200 295 L 370 295 L 370 400 L 200 400 Z',
  // ── East ──
  'Comunidad Valenciana': 'M 375 295 L 490 295 L 490 400 L 375 400 Z',
  // ── South ──
  'Extremadura': 'M 60 340 L 195 340 L 195 440 L 60 440 Z',
  'Región de Murcia': 'M 375 405 L 450 405 L 450 470 L 375 470 Z',
  'Andalucía': 'M 60 445 L 370 445 L 370 550 L 60 550 Z',
  // ── Islands ──
  'Baleares': 'M 560 260 L 660 260 L 660 340 L 560 340 Z',
  'Canarias': 'M 10 510 L 110 510 L 110 590 L 10 590 Z',
  // ── Autonomous cities ──
  'Ceuta': 'M 375 555 L 420 555 L 420 585 L 375 585 Z',
  'Melilla': 'M 425 555 L 470 555 L 470 585 L 425 585 Z',
};
