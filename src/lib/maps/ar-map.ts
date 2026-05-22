/**
 * Argentina Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 23 Argentine provinces
 * plus the Autonomous City of Buenos Aires (CABA).
 */

import type { MapRegion } from '@/lib/map-registry';

export const AR_REGIONS: MapRegion[] = [
  { name: 'Buenos Aires', id: 'AR-B', aliases: ['buenos aires', 'ba', 'bs as', 'bsas', 'provincia de buenos aires', 'pba'] },
  { name: 'CABA', id: 'AR-C', aliases: ['caba', 'ciudad autónoma de buenos aires', 'ciudad de buenos aires', 'capital federal', 'cf', 'buenos aires ciudad'] },
  { name: 'Catamarca', id: 'AR-K', aliases: ['catamarca'] },
  { name: 'Chaco', id: 'AR-H', aliases: ['chaco'] },
  { name: 'Chubut', id: 'AR-U', aliases: ['chubut'] },
  { name: 'Córdoba', id: 'AR-X', aliases: ['córdoba', 'cordoba'] },
  { name: 'Corrientes', id: 'AR-W', aliases: ['corrientes'] },
  { name: 'Entre Ríos', id: 'AR-E', aliases: ['entre ríos', 'entre rios'] },
  { name: 'Formosa', id: 'AR-P', aliases: ['formosa'] },
  { name: 'Jujuy', id: 'AR-Y', aliases: ['jujuy'] },
  { name: 'La Pampa', id: 'AR-L', aliases: ['la pampa'] },
  { name: 'La Rioja', id: 'AR-F', aliases: ['la rioja'] },
  { name: 'Mendoza', id: 'AR-M', aliases: ['mendoza'] },
  { name: 'Misiones', id: 'AR-N', aliases: ['misiones'] },
  { name: 'Neuquén', id: 'AR-Q', aliases: ['neuquén', 'neuquen'] },
  { name: 'Río Negro', id: 'AR-R', aliases: ['río negro', 'rio negro'] },
  { name: 'Salta', id: 'AR-A', aliases: ['salta'] },
  { name: 'San Juan', id: 'AR-J', aliases: ['san juan'] },
  { name: 'San Luis', id: 'AR-D', aliases: ['san luis'] },
  { name: 'Santa Cruz', id: 'AR-Z', aliases: ['santa cruz'] },
  { name: 'Santa Fe', id: 'AR-S', aliases: ['santa fe'] },
  { name: 'Santiago del Estero', id: 'AR-G', aliases: ['santiago del estero', 'sde'] },
  { name: 'Tierra del Fuego', id: 'AR-V', aliases: ['tierra del fuego', 'tdf', 'tierra del fuego, antártida e islas del atlántico sur'] },
  { name: 'Tucumán', id: 'AR-T', aliases: ['tucumán', 'tucuman', 'san miguel de tucumán'] },
];

/**
 * Simplified SVG paths for Argentine provinces.
 * ViewBox: 0 0 400 800
 * Layout: elongated N-S, Patagonia in the south, NOA in the northwest, Mesopotamia in the east
 */
export const AR_PATHS: Record<string, string> = {
  // Northwest (NOA)
  'Jujuy': 'M 80 10 L 160 10 L 160 80 L 80 80 Z',
  'Salta': 'M 80 85 L 200 85 L 200 155 L 80 155 Z',
  'Catamarca': 'M 50 160 L 130 160 L 130 230 L 50 230 Z',
  'La Rioja': 'M 10 160 L 45 160 L 45 250 L 10 250 Z',
  'Tucumán': 'M 135 160 L 200 160 L 200 210 L 135 210 Z',
  // Northeast (NEA / Mesopotamia)
  'Formosa': 'M 250 10 L 350 10 L 350 80 L 250 80 Z',
  'Chaco': 'M 250 85 L 350 85 L 350 155 L 250 155 Z',
  'Misiones': 'M 310 160 L 390 160 L 390 250 L 310 250 Z',
  'Corrientes': 'M 250 160 L 305 160 L 305 250 L 250 250 Z',
  'Entre Ríos': 'M 250 255 L 320 255 L 320 340 L 250 340 Z',
  // Center
  'Santiago del Estero': 'M 135 215 L 245 215 L 245 290 L 135 290 Z',
  'Córdoba': 'M 100 295 L 200 295 L 200 380 L 100 380 Z',
  'Santa Fe': 'M 205 295 L 320 295 L 320 380 L 205 380 Z',
  'San Juan': 'M 10 255 L 95 255 L 95 330 L 10 330 Z',
  'San Luis': 'M 10 335 L 95 335 L 95 390 L 10 390 Z',
  'Mendoza': 'M 10 395 L 95 395 L 95 470 L 10 470 Z',
  // Buenos Aires & CABA
  'Buenos Aires': 'M 140 385 L 280 385 L 280 470 L 140 470 Z',
  'CABA': 'M 205 410 L 240 410 L 240 445 L 205 445 Z',
  // La Pampa
  'La Pampa': 'M 10 475 L 250 475 L 250 550 L 10 550 Z',
  // Patagonia
  'Río Negro': 'M 10 555 L 250 555 L 250 620 L 10 620 Z',
  'Neuquén': 'M 255 475 L 370 475 L 370 550 L 255 550 Z',
  'Chubut': 'M 10 625 L 250 625 L 250 690 L 10 690 Z',
  'Santa Cruz': 'M 10 695 L 250 695 L 250 770 L 10 770 Z',
  'Tierra del Fuego': 'M 60 775 L 200 775 L 200 800 L 60 800 Z',
};
