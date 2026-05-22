/**
 * Mexico Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 32 Mexican states.
 * Each state is represented as a rounded polygon positioned
 * in a rough geographic arrangement.
 */

import type { MapRegion } from '@/lib/map-registry';

export const MX_REGIONS: MapRegion[] = [
  { name: 'Aguascalientes', id: 'MX-AGU', aliases: ['aguascalientes', 'ags'] },
  { name: 'Baja California', id: 'MX-BCN', aliases: ['baja california', 'baja california norte', 'bc', 'bcn'] },
  { name: 'Baja California Sur', id: 'MX-BCS', aliases: ['baja california sur', 'bcs'] },
  { name: 'Campeche', id: 'MX-CAM', aliases: ['campeche', 'camp'] },
  { name: 'Chiapas', id: 'MX-CHP', aliases: ['chiapas', 'chis'] },
  { name: 'Chihuahua', id: 'MX-CHH', aliases: ['chihuahua', 'chih'] },
  { name: 'Ciudad de México', id: 'MX-CMX', aliases: ['ciudad de méxico', 'cdmx', 'cdmx', 'distrito federal', 'df', 'mexico city', 'ciudad de mexico'] },
  { name: 'Coahuila', id: 'MX-COA', aliases: ['coahuila', 'coahuila de zaragoza', 'coah'] },
  { name: 'Colima', id: 'MX-COL', aliases: ['colima', 'col'] },
  { name: 'Durango', id: 'MX-DUR', aliases: ['durango', 'dgo'] },
  { name: 'Guanajuato', id: 'MX-GUA', aliases: ['guanajuato', 'gto'] },
  { name: 'Guerrero', id: 'MX-GRO', aliases: ['guerrero', 'gro'] },
  { name: 'Hidalgo', id: 'MX-HID', aliases: ['hidalgo', 'hgo'] },
  { name: 'Jalisco', id: 'MX-JAL', aliases: ['jalisco', 'jal'] },
  { name: 'México', id: 'MX-MEX', aliases: ['mexico', 'estado de méxico', 'estado de mexico', 'edomex', 'mex', 'edoméx'] },
  { name: 'Michoacán', id: 'MX-MIC', aliases: ['michoacán', 'michoacan', 'michoacán de ocampo', 'mich'] },
  { name: 'Morelos', id: 'MX-MOR', aliases: ['morelos', 'mor'] },
  { name: 'Nayarit', id: 'MX-NAY', aliases: ['nayarit', 'nay'] },
  { name: 'Nuevo León', id: 'MX-NLE', aliases: ['nuevo león', 'nuevo leon', 'n.l.', 'nl'] },
  { name: 'Oaxaca', id: 'MX-OAX', aliases: ['oaxaca', 'oax'] },
  { name: 'Puebla', id: 'MX-PUE', aliases: ['puebla', 'pue'] },
  { name: 'Querétaro', id: 'MX-QUE', aliases: ['querétaro', 'queretaro', 'qro'] },
  { name: 'Quintana Roo', id: 'MX-ROO', aliases: ['quintana roo', 'q.roo', 'qr'] },
  { name: 'San Luis Potosí', id: 'MX-SLP', aliases: ['san luis potosí', 'san luis potosi', 'slp'] },
  { name: 'Sinaloa', id: 'MX-SIN', aliases: ['sinaloa', 'sin'] },
  { name: 'Sonora', id: 'MX-SON', aliases: ['sonora', 'son'] },
  { name: 'Tabasco', id: 'MX-TAB', aliases: ['tabasco', 'tab'] },
  { name: 'Tamaulipas', id: 'MX-TAM', aliases: ['tamaulipas', 'tamps'] },
  { name: 'Tlaxcala', id: 'MX-TLA', aliases: ['tlaxcala', 'tlax'] },
  { name: 'Veracruz', id: 'MX-VER', aliases: ['veracruz', 'veracruz de ignacio de la llave', 'ver'] },
  { name: 'Yucatán', id: 'MX-YUC', aliases: ['yucatán', 'yucatan', 'yuc'] },
  { name: 'Zacatecas', id: 'MX-ZAC', aliases: ['zacatecas', 'zac'] },
];

/**
 * Simplified SVG paths for Mexican states.
 * ViewBox: 0 0 600 550
 * Rough geographic layout: NW = Baja California, Center = CDMX area, SE = Yucatán
 */
export const MX_PATHS: Record<string, string> = {
  // Northwest - Baja California
  'Baja California': 'M 10 10 L 80 10 L 80 120 L 10 120 Z',
  'Baja California Sur': 'M 10 125 L 80 125 L 80 230 L 10 230 Z',
  // North
  'Sonora': 'M 85 10 L 190 10 L 190 100 L 85 100 Z',
  'Chihuahua': 'M 195 10 L 310 10 L 310 100 L 195 100 Z',
  'Coahuila': 'M 315 10 L 430 10 L 430 80 L 315 80 Z',
  'Nuevo León': 'M 435 10 L 530 10 L 530 80 L 435 80 Z',
  'Tamaulipas': 'M 435 85 L 530 85 L 530 150 L 435 150 Z',
  // North-Central
  'Sinaloa': 'M 85 105 L 190 105 L 190 180 L 85 180 Z',
  'Durango': 'M 195 105 L 310 105 L 310 180 L 195 180 Z',
  'Zacatecas': 'M 315 85 L 430 85 L 430 155 L 315 155 Z',
  // Central-West
  'Nayarit': 'M 85 185 L 150 185 L 150 240 L 85 240 Z',
  'Jalisco': 'M 155 185 L 240 185 L 240 260 L 155 260 Z',
  'Aguascalientes': 'M 245 185 L 310 185 L 310 230 L 245 230 Z',
  'Colima': 'M 85 245 L 150 245 L 150 290 L 85 290 Z',
  // Central
  'Guanajuato': 'M 245 235 L 310 235 L 310 280 L 245 280 Z',
  'Querétaro': 'M 315 160 L 380 160 L 380 210 L 315 210 Z',
  'San Luis Potosí': 'M 315 215 L 430 215 L 430 270 L 315 270 Z',
  'Hidalgo': 'M 385 160 L 450 160 L 450 210 L 385 210 Z',
  // Mexico City area
  'Ciudad de México': 'M 315 275 L 370 275 L 370 310 L 315 310 Z',
  'México': 'M 245 285 L 310 285 L 310 340 L 245 340 Z',
  'Morelos': 'M 315 315 L 370 315 L 370 350 L 315 350 Z',
  'Tlaxcala': 'M 375 275 L 430 275 L 430 310 L 375 310 Z',
  'Puebla': 'M 375 315 L 450 315 L 450 370 L 375 370 Z',
  // South-Central
  'Michoacán': 'M 155 265 L 240 265 L 240 340 L 155 340 Z',
  'Guerrero': 'M 155 345 L 300 345 L 300 420 L 155 420 Z',
  'Oaxaca': 'M 305 375 L 400 375 L 400 460 L 305 460 Z',
  // Gulf coast
  'Veracruz': 'M 435 275 L 530 275 L 530 370 L 435 370 Z',
  'Tabasco': 'M 435 375 L 500 375 L 500 420 L 435 420 Z',
  // Southeast
  'Chiapas': 'M 305 465 L 400 465 L 400 540 L 305 540 Z',
  'Campeche': 'M 405 425 L 490 425 L 490 490 L 405 490 Z',
  'Yucatán': 'M 495 375 L 590 375 L 590 450 L 495 450 Z',
  'Quintana Roo': 'M 495 455 L 590 455 L 590 540 L 495 540 Z',
};
