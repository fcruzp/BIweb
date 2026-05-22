/**
 * Colombia Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 32 Colombian departments
 * plus the Capital District (Bogotá).
 */

import type { MapRegion } from '@/lib/map-registry';

export const CO_REGIONS: MapRegion[] = [
  { name: 'Amazonas', id: 'CO-AMA', aliases: ['amazonas'] },
  { name: 'Antioquia', id: 'CO-ANT', aliases: ['antioquia'] },
  { name: 'Arauca', id: 'CO-ARA', aliases: ['arauca'] },
  { name: 'Atlántico', id: 'CO-ATL', aliases: ['atlántico', 'atlantico'] },
  { name: 'Bolívar', id: 'CO-BOL', aliases: ['bolívar', 'bolivar'] },
  { name: 'Boyacá', id: 'CO-BOY', aliases: ['boyacá', 'boyaca'] },
  { name: 'Caldas', id: 'CO-CAL', aliases: ['caldas'] },
  { name: 'Caquetá', id: 'CO-CAQ', aliases: ['caquetá', 'caqueta'] },
  { name: 'Casanare', id: 'CO-CAS', aliases: ['casanare'] },
  { name: 'Cauca', id: 'CO-CAU', aliases: ['cauca'] },
  { name: 'Cesar', id: 'CO-CES', aliases: ['cesar'] },
  { name: 'Chocó', id: 'CO-CHO', aliases: ['chocó', 'choco'] },
  { name: 'Córdoba', id: 'CO-COR', aliases: ['córdoba', 'cordoba'] },
  { name: 'Cundinamarca', id: 'CO-CUN', aliases: ['cundinamarca'] },
  { name: 'Guainía', id: 'CO-GUA', aliases: ['guainía', 'guainia'] },
  { name: 'Guaviare', id: 'CO-GUV', aliases: ['guaviare'] },
  { name: 'Huila', id: 'CO-HUI', aliases: ['huila'] },
  { name: 'La Guajira', id: 'CO-LAG', aliases: ['la guajira', 'guajira'] },
  { name: 'Magdalena', id: 'CO-MAG', aliases: ['magdalena'] },
  { name: 'Meta', id: 'CO-MET', aliases: ['meta'] },
  { name: 'Nariño', id: 'CO-NAR', aliases: ['nariño', 'narino'] },
  { name: 'Norte de Santander', id: 'CO-NSA', aliases: ['norte de santander', 'n.s.'] },
  { name: 'Putumayo', id: 'CO-PUT', aliases: ['putumayo'] },
  { name: 'Quindío', id: 'CO-QUI', aliases: ['quindío', 'quindio'] },
  { name: 'Risaralda', id: 'CO-RIS', aliases: ['risaralda'] },
  { name: 'San Andrés', id: 'CO-SAP', aliases: ['san andrés', 'san andres', 'san andrés y providencia', 'providencia'] },
  { name: 'Santander', id: 'CO-SAN', aliases: ['santander'] },
  { name: 'Sucre', id: 'CO-SUC', aliases: ['sucre'] },
  { name: 'Tolima', id: 'CO-TOL', aliases: ['tolima'] },
  { name: 'Valle del Cauca', id: 'CO-VAC', aliases: ['valle del cauca', 'valle', 'vallecauca'] },
  { name: 'Vaupés', id: 'CO-VAU', aliases: ['vaupés', 'vaupes'] },
  { name: 'Vichada', id: 'CO-VID', aliases: ['vichada'] },
  { name: 'Bogotá', id: 'CO-DC', aliases: ['bogotá', 'bogota', 'distrito capital', 'd.c.', 'dc'] },
];

/**
 * Simplified SVG paths for Colombian departments.
 * ViewBox: 0 0 500 600
 * Rough geographic layout: Caribbean coast (north), Andes (center), Amazon (south)
 */
export const CO_PATHS: Record<string, string> = {
  // Caribbean coast - North
  'La Guajira': 'M 250 10 L 370 10 L 370 60 L 250 60 Z',
  'Atlántico': 'M 160 65 L 245 65 L 245 110 L 160 110 Z',
  'Magdalena': 'M 250 65 L 370 65 L 370 130 L 250 130 Z',
  'Cesar': 'M 375 10 L 480 10 L 480 90 L 375 90 Z',
  'Bolívar': 'M 160 115 L 310 115 L 310 180 L 160 180 Z',
  'Sucre': 'M 80 115 L 155 115 L 155 175 L 80 175 Z',
  'Córdoba': 'M 10 115 L 75 115 L 75 195 L 10 195 Z',
  // Northeast
  'Norte de Santander': 'M 375 95 L 480 95 L 480 155 L 375 155 Z',
  'Santander': 'M 315 160 L 480 160 L 480 230 L 315 230 Z',
  'Arauca': 'M 375 235 L 490 235 L 490 295 L 375 295 Z',
  // Andean region - Center
  'Antioquia': 'M 10 200 L 150 200 L 150 290 L 10 290 Z',
  'Chocó': 'M 10 10 L 155 10 L 155 110 L 10 110 Z',
  'Boyacá': 'M 315 235 L 370 235 L 370 310 L 315 310 Z',
  'Cundinamarca': 'M 250 300 L 310 300 L 310 360 L 250 360 Z',
  'Bogotá': 'M 260 315 L 300 315 L 300 350 L 260 350 Z',
  // Coffee axis
  'Caldas': 'M 155 245 L 230 245 L 230 300 L 155 300 Z',
  'Risaralda': 'M 155 195 L 230 195 L 230 240 L 155 240 Z',
  'Quindío': 'M 155 305 L 230 305 L 230 340 L 155 340 Z',
  'Tolima': 'M 155 345 L 250 345 L 250 410 L 155 410 Z',
  'Huila': 'M 255 365 L 350 365 L 350 440 L 255 440 Z',
  // Pacific
  'Valle del Cauca': 'M 10 295 L 150 295 L 150 380 L 10 380 Z',
  'Cauca': 'M 10 385 L 100 385 L 100 460 L 10 460 Z',
  'Nariño': 'M 10 465 L 120 465 L 120 550 L 10 550 Z',
  // Eastern plains
  'Casanare': 'M 375 300 L 490 300 L 490 360 L 375 360 Z',
  'Meta': 'M 315 365 L 490 365 L 490 440 L 315 440 Z',
  // Amazon - South
  'Caquetá': 'M 200 445 L 310 445 L 310 520 L 200 520 Z',
  'Putumayo': 'M 105 520 L 220 520 L 220 590 L 105 590 Z',
  'Amazonas': 'M 225 525 L 400 525 L 400 595 L 225 595 Z',
  'Guaviare': 'M 315 445 L 490 445 L 490 520 L 315 520 Z',
  'Guainía': 'M 405 445 L 490 445 L 490 520 L 405 520 Z',
  'Vaupés': 'M 405 525 L 490 525 L 490 595 L 405 595 Z',
  'Vichada': 'M 405 360 L 490 360 L 490 440 L 405 440 Z',
  // Island (small, positioned separately)
  'San Andrés': 'M 440 10 L 490 10 L 490 50 L 440 50 Z',
};
