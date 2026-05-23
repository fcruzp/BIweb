/**
 * Chile Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 16 Chilean regions.
 * Chile is long and thin, so the layout is vertical (north to south).
 * Each region is represented as a rectangle/polygon positioned
 * in a rough geographic arrangement.
 */

import type { MapRegion } from '@/lib/map-registry';

export const CL_REGIONS: MapRegion[] = [
  { name: 'Arica y Parinacota', id: 'CL-AP', aliases: ['arica y parinacota', 'arica', 'parinacota', 'xv', '15', 'ap'] },
  { name: 'Tarapacá', id: 'CL-TA', aliases: ['tarapacá', 'tarapaca', 'i', '1'] },
  { name: 'Antofagasta', id: 'CL-AN', aliases: ['antofagasta', 'ii', '2'] },
  { name: 'Atacama', id: 'CL-AT', aliases: ['atacama', 'iii', '3'] },
  { name: 'Coquimbo', id: 'CL-CO', aliases: ['coquimbo', 'iv', '4'] },
  { name: 'Valparaíso', id: 'CL-VS', aliases: ['valparaíso', 'valparaiso', 'v', '5', 'valpo'] },
  { name: 'Región Metropolitana', id: 'CL-RM', aliases: ['región metropolitana', 'region metropolitana', 'rm', 'metropolitana', 'santiago', 'santiago metropolitana', 'rm de santiago', 'xiii', '13'] },
  { name: "O'Higgins", id: 'CL-LI', aliases: ["o'higgins", "libertador bernardo o'higgins", "ohiggins", 'vi', '6', 'libertador', 'rancagua'] },
  { name: 'Maule', id: 'CL-ML', aliases: ['maule', 'vii', '7'] },
  { name: 'Ñuble', id: 'CL-NB', aliases: ['ñuble', 'nuble', 'xvi', '16', 'chillán', 'chillan'] },
  { name: 'Biobío', id: 'CL-BI', aliases: ['biobío', 'biobio', 'bío bío', 'bio bio', 'viii', '8', 'concepción', 'concepcion'] },
  { name: 'La Araucanía', id: 'CL-AR', aliases: ['la araucanía', 'la araucania', 'araucanía', 'araucania', 'ix', '9', 'temuco'] },
  { name: 'Los Ríos', id: 'CL-LR', aliases: ['los ríos', 'los rios', 'xiv', '14', 'valdivia'] },
  { name: 'Los Lagos', id: 'CL-LL', aliases: ['los lagos', 'x', '10', 'puerto montt'] },
  { name: 'Aysén', id: 'CL-AI', aliases: ['aysén', 'aysen', 'aysén del general carlos ibáñez del campo', 'xi', '11'] },
  { name: 'Magallanes', id: 'CL-MG', aliases: ['magallanes', 'magallanes y de la antártica chilena', 'xii', '12', 'punta arenas'] },
];

/**
 * Simplified SVG paths for Chilean regions.
 * ViewBox: 0 0 300 960
 * Vertical layout: north (top) to south (bottom), reflecting Chile's elongated shape.
 * Wider blocks in the center (Valparaíso, RM, O'Higgins, Maule) reflect the
 * more populated central valley; narrower blocks in the far south (Aysén, Magallanes).
 */
export const CL_PATHS: Record<string, string> = {
  // Far north
  'Arica y Parinacota': 'M 80 10 L 220 10 L 220 60 L 80 60 Z',
  'Tarapacá': 'M 75 65 L 225 65 L 225 130 L 75 130 Z',
  'Antofagasta': 'M 70 135 L 230 135 L 230 225 L 70 225 Z',
  // North
  'Atacama': 'M 65 230 L 235 230 L 235 320 L 65 320 Z',
  'Coquimbo': 'M 60 325 L 240 325 L 240 410 L 60 410 Z',
  // Central
  'Valparaíso': 'M 35 415 L 155 415 L 155 480 L 35 480 Z',
  'Región Metropolitana': 'M 160 415 L 290 415 L 290 480 L 160 480 Z',
  "O'Higgins": 'M 40 485 L 200 485 L 200 555 L 40 555 Z',
  'Maule': 'M 50 560 L 250 560 L 250 630 L 50 630 Z',
  // South-central
  'Ñuble': 'M 55 635 L 245 635 L 245 695 L 55 695 Z',
  'Biobío': 'M 50 700 L 250 700 L 250 770 L 50 770 Z',
  'La Araucanía': 'M 55 775 L 245 775 L 245 835 L 55 835 Z',
  // South
  'Los Ríos': 'M 65 840 L 235 840 L 235 885 L 65 885 Z',
  'Los Lagos': 'M 60 890 L 240 890 L 240 935 L 60 935 Z',
  // Far south
  'Aysén': 'M 80 940 L 220 940 L 220 975 L 80 975 Z',
  'Magallanes': 'M 90 980 L 210 980 L 210 1010 L 90 1010 Z',
};
