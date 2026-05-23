/**
 * Brazil Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 26 Brazilian states
 * plus the Distrito Federal.
 * Each region is represented as a rectangle/polygon positioned
 * in a rough geographic arrangement.
 */

import type { MapRegion } from '@/lib/map-registry';

export const BR_REGIONS: MapRegion[] = [
  { name: 'Acre', id: 'BR-AC', aliases: ['acre', 'ac'] },
  { name: 'Alagoas', id: 'BR-AL', aliases: ['alagoas', 'al'] },
  { name: 'Amapá', id: 'BR-AP', aliases: ['amapá', 'amapa', 'ap'] },
  { name: 'Amazonas', id: 'BR-AM', aliases: ['amazonas', 'am'] },
  { name: 'Bahia', id: 'BR-BA', aliases: ['bahia', 'ba'] },
  { name: 'Ceará', id: 'BR-CE', aliases: ['ceará', 'ceara', 'ce'] },
  { name: 'Distrito Federal', id: 'BR-DF', aliases: ['distrito federal', 'df', 'brasília', 'brasilia'] },
  { name: 'Espírito Santo', id: 'BR-ES', aliases: ['espírito santo', 'espirito santo', 'es', 'capixaba'] },
  { name: 'Goiás', id: 'BR-GO', aliases: ['goiás', 'goias', 'go'] },
  { name: 'Maranhão', id: 'BR-MA', aliases: ['maranhão', 'maranhao', 'ma'] },
  { name: 'Mato Grosso', id: 'BR-MT', aliases: ['mato grosso', 'mt'] },
  { name: 'Mato Grosso do Sul', id: 'BR-MS', aliases: ['mato grosso do sul', 'ms', 'mato grosso do sul'] },
  { name: 'Minas Gerais', id: 'BR-MG', aliases: ['minas gerais', 'mg'] },
  { name: 'Pará', id: 'BR-PA', aliases: ['pará', 'para', 'pa'] },
  { name: 'Paraíba', id: 'BR-PB', aliases: ['paraíba', 'paraiba', 'pb'] },
  { name: 'Paraná', id: 'BR-PR', aliases: ['paraná', 'parana', 'pr'] },
  { name: 'Pernambuco', id: 'BR-PE', aliases: ['pernambuco', 'pe'] },
  { name: 'Piauí', id: 'BR-PI', aliases: ['piauí', 'piaui', 'pi'] },
  { name: 'Rio de Janeiro', id: 'BR-RJ', aliases: ['rio de janeiro', 'rj'] },
  { name: 'Rio Grande do Norte', id: 'BR-RN', aliases: ['rio grande do norte', 'rn', 'r.g.n.'] },
  { name: 'Rio Grande do Sul', id: 'BR-RS', aliases: ['rio grande do sul', 'rs', 'r.g.s.'] },
  { name: 'Rondônia', id: 'BR-RO', aliases: ['rondônia', 'rondonia', 'ro'] },
  { name: 'Roraima', id: 'BR-RR', aliases: ['roraima', 'rr'] },
  { name: 'Santa Catarina', id: 'BR-SC', aliases: ['santa catarina', 'sc'] },
  { name: 'São Paulo', id: 'BR-SP', aliases: ['são paulo', 'sao paulo', 'sp'] },
  { name: 'Sergipe', id: 'BR-SE', aliases: ['sergipe', 'se'] },
  { name: 'Tocantins', id: 'BR-TO', aliases: ['tocantins', 'to'] },
];

/**
 * Simplified SVG paths for Brazilian states.
 * ViewBox: 0 0 960 700
 * Rough geographic layout:
 *   - North (Amazon): Roraima, Amapá, Amazonas, Pará, Acre, Rondônia, Tocantins (top half)
 *   - Northeast: Maranhão, Piauí, Ceará, Rio Grande do Norte, Paraíba, Pernambuco, Alagoas, Sergipe, Bahia (right-center)
 *   - Center-West: Mato Grosso, Mato Grosso do Sul, Goiás, Distrito Federal (center)
 *   - Southeast: Minas Gerais, São Paulo, Rio de Janeiro, Espírito Santo (bottom-center)
 *   - South: Paraná, Santa Catarina, Rio Grande do Sul (bottom)
 */
export const BR_PATHS: Record<string, string> = {
  // ── Far North ──
  'Roraima': 'M 80 10 L 200 10 L 200 80 L 80 80 Z',
  'Amapá': 'M 340 10 L 440 10 L 440 70 L 340 70 Z',
  'Amazonas': 'M 80 85 L 260 85 L 260 220 L 80 220 Z',
  'Acre': 'M 10 130 L 75 130 L 75 220 L 10 220 Z',
  'Pará': 'M 265 85 L 440 85 L 440 200 L 265 200 Z',
  // ── North ──
  'Rondônia': 'M 10 225 L 120 225 L 120 310 L 10 310 Z',
  'Tocantins': 'M 350 205 L 460 205 L 460 310 L 350 310 Z',
  // ── Northeast ──
  'Maranhão': 'M 265 205 L 345 205 L 345 310 L 265 310 Z',
  'Piauí': 'M 465 210 L 560 210 L 560 310 L 465 310 Z',
  'Ceará': 'M 565 210 L 650 210 L 650 280 L 565 280 Z',
  'Rio Grande do Norte': 'M 655 210 L 740 210 L 740 270 L 655 270 Z',
  'Paraíba': 'M 655 275 L 740 275 L 740 330 L 655 330 Z',
  'Pernambuco': 'M 565 285 L 650 285 L 650 360 L 565 360 Z',
  'Alagoas': 'M 655 335 L 740 335 L 740 380 L 655 380 Z',
  'Sergipe': 'M 565 365 L 650 365 L 650 400 L 565 400 Z',
  'Bahia': 'M 465 315 L 560 315 L 560 460 L 465 460 Z',
  // ── Center-West ──
  'Mato Grosso': 'M 125 225 L 260 225 L 260 370 L 125 370 Z',
  'Mato Grosso do Sul': 'M 125 375 L 260 375 L 260 460 L 125 460 Z',
  'Goiás': 'M 265 315 L 345 315 L 345 420 L 265 420 Z',
  'Distrito Federal': 'M 270 375 L 340 375 L 340 415 L 270 415 Z',
  // ── Southeast ──
  'Minas Gerais': 'M 350 425 L 460 425 L 460 540 L 350 540 Z',
  'Espírito Santo': 'M 465 465 L 520 465 L 520 540 L 465 540 Z',
  'Rio de Janeiro': 'M 465 545 L 560 545 L 560 620 L 465 620 Z',
  'São Paulo': 'M 265 465 L 460 465 L 460 545 L 265 545 Z',
  // ── South ──
  'Paraná': 'M 200 550 L 370 550 L 370 630 L 200 630 Z',
  'Santa Catarina': 'M 200 635 L 370 635 L 370 690 L 200 690 Z',
  'Rio Grande do Sul': 'M 70 635 L 195 635 L 195 700 L 70 700 Z',
};
