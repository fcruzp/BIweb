/**
 * Peru Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 25 Peruvian departments
 * plus the Callao constitutional province.
 * Each region is represented as a rectangle/polygon positioned
 * in a rough geographic arrangement.
 */

import type { MapRegion } from '@/lib/map-registry';

export const PE_REGIONS: MapRegion[] = [
  { name: 'Amazonas', id: 'PE-AMA', aliases: ['amazonas'] },
  { name: 'Áncash', id: 'PE-ANC', aliases: ['áncash', 'ancash'] },
  { name: 'Apurímac', id: 'PE-APU', aliases: ['apurímac', 'apurimac'] },
  { name: 'Arequipa', id: 'PE-ARE', aliases: ['arequipa', 'aq', 'aqp'] },
  { name: 'Ayacucho', id: 'PE-AYA', aliases: ['ayacucho'] },
  { name: 'Cajamarca', id: 'PE-CAJ', aliases: ['cajamarca', 'caj'] },
  { name: 'Callao', id: 'PE-CAL', aliases: ['callao', 'ch', 'provincia constitucional del callao'] },
  { name: 'Cusco', id: 'PE-CUS', aliases: ['cusco', 'cz', 'cuzco', 'qosqo'] },
  { name: 'Huancavelica', id: 'PE-HUV', aliases: ['huancavelica', 'hv', 'hvc'] },
  { name: 'Huánuco', id: 'PE-HUC', aliases: ['huánuco', 'huanuco', 'ho', 'hno'] },
  { name: 'Ica', id: 'PE-ICA', aliases: ['ica'] },
  { name: 'Junín', id: 'PE-JUN', aliases: ['junín', 'junin', 'ju'] },
  { name: 'La Libertad', id: 'PE-LAL', aliases: ['la libertad', 'ld', 'trujillo'] },
  { name: 'Lambayeque', id: 'PE-LAM', aliases: ['lambayeque', 'lb', 'chiclayo'] },
  { name: 'Lima', id: 'PE-LIM', aliases: ['lima', 'lma', 'lima metropolitana', 'departamento de lima'] },
  { name: 'Lima Provincias', id: 'PE-LMA', aliases: ['lima provincias', 'provincias de lima', 'region lima'] },
  { name: 'Loreto', id: 'PE-LOR', aliases: ['loreto', 'lo', 'iquitos'] },
  { name: 'Madre de Dios', id: 'PE-MDD', aliases: ['madre de dios', 'mdd', 'md', 'puerto maldonado'] },
  { name: 'Moquegua', id: 'PE-MOQ', aliases: ['moquegua', 'mo', 'mq'] },
  { name: 'Pasco', id: 'PE-PAS', aliases: ['pasco', 'pa'] },
  { name: 'Piura', id: 'PE-PIU', aliases: ['piura', 'pi'] },
  { name: 'Puno', id: 'PE-PUN', aliases: ['puno', 'pu'] },
  { name: 'San Martín', id: 'PE-SAM', aliases: ['san martín', 'san martin', 'sm', 'smr'] },
  { name: 'Tacna', id: 'PE-TAC', aliases: ['tacna', 'ta'] },
  { name: 'Tumbes', id: 'PE-TUM', aliases: ['tumbes', 'tu', 'tum'] },
  { name: 'Ucayali', id: 'PE-UCA', aliases: ['ucayali', 'uc', 'uca', 'pucallpa'] },
];

/**
 * Simplified SVG paths for Peruvian departments.
 * ViewBox: 0 0 700 700
 * Rough geographic layout in three bands:
 *   Left = Coast (N→S), Center = Highland (N→S), Right = Jungle
 *   North = top, South = bottom
 */
export const PE_PATHS: Record<string, string> = {
  // ── North coast ──
  'Tumbes': 'M 20 10 L 120 10 L 120 55 L 20 55 Z',
  'Piura': 'M 20 60 L 120 60 L 120 130 L 20 130 Z',
  'Lambayeque': 'M 20 135 L 120 135 L 120 200 L 20 200 Z',
  'La Libertad': 'M 20 205 L 120 205 L 120 290 L 20 290 Z',
  // ── North highland ──
  'Cajamarca': 'M 125 60 L 260 60 L 260 140 L 125 140 Z',
  'Amazonas': 'M 265 10 L 380 10 L 380 100 L 265 100 Z',
  // ── Northeast jungle ──
  'Loreto': 'M 440 10 L 690 10 L 690 200 L 440 200 Z',
  'San Martín': 'M 265 105 L 435 105 L 435 200 L 265 200 Z',
  'Ucayali': 'M 440 205 L 690 205 L 690 380 L 440 380 Z',
  // ── Central coast ──
  'Áncash': 'M 20 295 L 120 295 L 120 370 L 20 370 Z',
  'Lima': 'M 20 375 L 80 375 L 80 440 L 20 440 Z',
  'Callao': 'M 85 375 L 120 375 L 120 410 L 85 410 Z',
  'Ica': 'M 20 445 L 120 445 L 120 530 L 20 530 Z',
  // ── Central highland ──
  'Huánuco': 'M 125 145 L 260 145 L 260 205 L 125 205 Z',
  'Pasco': 'M 125 210 L 260 210 L 260 280 L 125 280 Z',
  'Junín': 'M 125 285 L 260 285 L 260 370 L 125 370 Z',
  'Huancavelica': 'M 125 375 L 260 375 L 260 440 L 125 440 Z',
  'Lima Provincias': 'M 125 445 L 260 445 L 260 510 L 125 510 Z',
  // ── South highland ──
  'Ayacucho': 'M 125 515 L 260 515 L 260 590 L 125 590 Z',
  'Apurímac': 'M 265 445 L 380 445 L 380 520 L 265 520 Z',
  'Cusco': 'M 265 375 L 435 375 L 435 440 L 265 440 Z',
  // ── South coast ──
  'Arequipa': 'M 20 535 L 120 535 L 120 640 L 20 640 Z',
  'Moquegua': 'M 125 595 L 210 595 L 210 660 L 125 660 Z',
  'Tacna': 'M 125 665 L 210 665 L 210 700 L 125 700 Z',
  // ── Southeast ──
  'Puno': 'M 265 525 L 435 525 L 435 640 L 265 640 Z',
  'Madre de Dios': 'M 440 385 L 620 385 L 620 530 L 440 530 Z',
};
