/**
 * United States Map Data — Simplified SVG heat map
 *
 * Uses a simplified grid layout for the 50 US states.
 * Each state is represented as a rounded rectangle positioned
 * in a rough geographic arrangement.
 */

import type { MapRegion } from '@/lib/map-registry';

export const US_REGIONS: MapRegion[] = [
  // Northeast
  { name: 'Maine', id: 'US-ME', aliases: ['me', 'maine'] },
  { name: 'New Hampshire', id: 'US-NH', aliases: ['nh', 'new hampshire'] },
  { name: 'Vermont', id: 'US-VT', aliases: ['vt', 'vermont'] },
  { name: 'Massachusetts', id: 'US-MA', aliases: ['ma', 'massachusetts', 'mass'] },
  { name: 'Rhode Island', id: 'US-RI', aliases: ['ri', 'rhode island'] },
  { name: 'Connecticut', id: 'US-CT', aliases: ['ct', 'connecticut'] },
  { name: 'New York', id: 'US-NY', aliases: ['ny', 'new york'] },
  { name: 'New Jersey', id: 'US-NJ', aliases: ['nj', 'new jersey'] },
  { name: 'Pennsylvania', id: 'US-PA', aliases: ['pa', 'pennsylvania', 'penn'] },
  // Midwest
  { name: 'Ohio', id: 'US-OH', aliases: ['oh', 'ohio'] },
  { name: 'Michigan', id: 'US-MI', aliases: ['mi', 'michigan'] },
  { name: 'Indiana', id: 'US-IN', aliases: ['in', 'indiana'] },
  { name: 'Illinois', id: 'US-IL', aliases: ['il', 'illinois'] },
  { name: 'Wisconsin', id: 'US-WI', aliases: ['wi', 'wisconsin'] },
  { name: 'Minnesota', id: 'US-MN', aliases: ['mn', 'minnesota'] },
  { name: 'Iowa', id: 'US-IA', aliases: ['ia', 'iowa'] },
  { name: 'Missouri', id: 'US-MO', aliases: ['mo', 'missouri'] },
  { name: 'North Dakota', id: 'US-ND', aliases: ['nd', 'north dakota'] },
  { name: 'South Dakota', id: 'US-SD', aliases: ['sd', 'south dakota'] },
  { name: 'Nebraska', id: 'US-NE', aliases: ['ne', 'nebraska'] },
  { name: 'Kansas', id: 'US-KS', aliases: ['ks', 'kansas'] },
  // South
  { name: 'Delaware', id: 'US-DE', aliases: ['de', 'delaware'] },
  { name: 'Maryland', id: 'US-MD', aliases: ['md', 'maryland'] },
  { name: 'Virginia', id: 'US-VA', aliases: ['va', 'virginia'] },
  { name: 'West Virginia', id: 'US-WV', aliases: ['wv', 'west virginia'] },
  { name: 'North Carolina', id: 'US-NC', aliases: ['nc', 'north carolina'] },
  { name: 'South Carolina', id: 'US-SC', aliases: ['sc', 'south carolina'] },
  { name: 'Georgia', id: 'US-GA', aliases: ['ga', 'georgia'] },
  { name: 'Florida', id: 'US-FL', aliases: ['fl', 'florida'] },
  { name: 'Kentucky', id: 'US-KY', aliases: ['ky', 'kentucky'] },
  { name: 'Tennessee', id: 'US-TN', aliases: ['tn', 'tennessee'] },
  { name: 'Alabama', id: 'US-AL', aliases: ['al', 'alabama'] },
  { name: 'Mississippi', id: 'US-MS', aliases: ['ms', 'mississippi'] },
  { name: 'Arkansas', id: 'US-AR', aliases: ['ar', 'arkansas'] },
  { name: 'Louisiana', id: 'US-LA', aliases: ['la', 'louisiana'] },
  { name: 'Oklahoma', id: 'US-OK', aliases: ['ok', 'oklahoma'] },
  { name: 'Texas', id: 'US-TX', aliases: ['tx', 'texas'] },
  // West
  { name: 'Montana', id: 'US-MT', aliases: ['mt', 'montana'] },
  { name: 'Wyoming', id: 'US-WY', aliases: ['wy', 'wyoming'] },
  { name: 'Colorado', id: 'US-CO', aliases: ['co', 'colorado'] },
  { name: 'New Mexico', id: 'US-NM', aliases: ['nm', 'new mexico'] },
  { name: 'Arizona', id: 'US-AZ', aliases: ['az', 'arizona'] },
  { name: 'Utah', id: 'US-UT', aliases: ['ut', 'utah'] },
  { name: 'Nevada', id: 'US-NV', aliases: ['nv', 'nevada'] },
  { name: 'Idaho', id: 'US-ID', aliases: ['id', 'idaho'] },
  { name: 'Washington', id: 'US-WA', aliases: ['wa', 'washington'] },
  { name: 'Oregon', id: 'US-OR', aliases: ['or', 'oregon'] },
  { name: 'California', id: 'US-CA', aliases: ['ca', 'california'] },
  // Alaska & Hawaii
  { name: 'Alaska', id: 'US-AK', aliases: ['ak', 'alaska'] },
  { name: 'Hawaii', id: 'US-HI', aliases: ['hi', 'hawaii'] },
];

/**
 * Simplified SVG paths for US states.
 * Uses a grid-based layout with rough geographic positioning.
 * ViewBox: 0 0 960 600
 */
export const US_PATHS: Record<string, string> = {
  // Pacific Northwest
  'Washington': 'M 30 30 L 130 30 L 130 80 L 30 80 Z',
  'Oregon': 'M 30 85 L 130 85 L 130 135 L 30 135 Z',
  // California
  'California': 'M 30 140 L 130 140 L 130 260 L 30 260 Z',
  // Nevada
  'Nevada': 'M 135 30 L 195 30 L 195 160 L 135 160 Z',
  // Idaho
  'Idaho': 'M 135 165 L 195 165 L 195 110 L 260 110 L 260 30 L 200 30 L 135 30 L 135 165 Z',
  // Montana
  'Montana': 'M 200 30 L 370 30 L 370 80 L 200 80 Z',
  // Wyoming
  'Wyoming': 'M 200 85 L 370 85 L 370 135 L 200 135 Z',
  // Utah
  'Utah': 'M 135 165 L 195 165 L 195 260 L 135 260 Z',
  // Colorado
  'Colorado': 'M 200 140 L 370 140 L 370 200 L 200 200 Z',
  // Arizona
  'Arizona': 'M 135 265 L 195 265 L 195 350 L 135 350 Z',
  // New Mexico
  'New Mexico': 'M 200 205 L 370 205 L 370 350 L 200 350 Z',
  // North Dakota
  'North Dakota': 'M 375 30 L 470 30 L 470 80 L 375 80 Z',
  // South Dakota
  'South Dakota': 'M 375 85 L 470 85 L 470 135 L 375 135 Z',
  // Nebraska
  'Nebraska': 'M 375 140 L 470 140 L 470 190 L 375 190 Z',
  // Kansas
  'Kansas': 'M 375 195 L 470 195 L 470 245 L 375 245 Z',
  // Minnesota
  'Minnesota': 'M 475 30 L 550 30 L 550 110 L 475 110 Z',
  // Iowa
  'Iowa': 'M 475 115 L 550 115 L 550 175 L 475 175 Z',
  // Missouri
  'Missouri': 'M 475 180 L 550 180 L 550 245 L 475 245 Z',
  // Wisconsin
  'Wisconsin': 'M 555 30 L 630 30 L 630 110 L 555 110 Z',
  // Illinois
  'Illinois': 'M 555 115 L 630 115 L 630 200 L 555 200 Z',
  // Michigan
  'Michigan': 'M 635 30 L 710 30 L 710 130 L 635 130 Z',
  // Indiana
  'Indiana': 'M 635 135 L 710 135 L 710 200 L 635 200 Z',
  // Ohio
  'Ohio': 'M 715 135 L 790 135 L 790 200 L 715 200 Z',
  // Maine
  'Maine': 'M 890 30 L 950 30 L 950 110 L 890 110 Z',
  // New Hampshire
  'New Hampshire': 'M 850 30 L 885 30 L 885 90 L 850 90 Z',
  // Vermont
  'Vermont': 'M 815 30 L 845 30 L 845 90 L 815 90 Z',
  // Massachusetts
  'Massachusetts': 'M 815 95 L 885 95 L 885 130 L 815 130 Z',
  // Rhode Island
  'Rhode Island': 'M 815 135 L 850 135 L 850 160 L 815 160 Z',
  // Connecticut
  'Connecticut': 'M 815 165 L 850 165 L 850 190 L 815 190 Z',
  // New York
  'New York': 'M 715 30 L 810 30 L 810 130 L 715 130 Z',
  // Pennsylvania
  'Pennsylvania': 'M 715 135 L 810 135 L 795 190 L 715 190 Z',
  // New Jersey
  'New Jersey': 'M 795 135 L 810 135 L 810 190 L 795 190 Z',
  // Delaware
  'Delaware': 'M 795 195 L 810 195 L 810 230 L 795 230 Z',
  // Maryland
  'Maryland': 'M 715 195 L 790 195 L 790 230 L 715 230 Z',
  // West Virginia
  'West Virginia': 'M 715 235 L 790 235 L 790 275 L 715 275 Z',
  // Virginia
  'Virginia': 'M 715 280 L 850 280 L 850 330 L 715 330 Z',
  // North Carolina
  'North Carolina': 'M 715 335 L 850 335 L 850 385 L 715 385 Z',
  // South Carolina
  'South Carolina': 'M 715 390 L 800 390 L 800 440 L 715 440 Z',
  // Georgia
  'Georgia': 'M 620 390 L 710 390 L 710 460 L 620 460 Z',
  // Florida
  'Florida': 'M 620 465 L 710 465 L 720 560 L 620 560 Z',
  // Kentucky
  'Kentucky': 'M 620 280 L 710 280 L 710 330 L 620 330 Z',
  // Tennessee
  'Tennessee': 'M 555 335 L 615 335 L 615 385 L 555 385 Z',
  // Alabama
  'Alabama': 'M 555 390 L 615 390 L 615 460 L 555 460 Z',
  // Mississippi
  'Mississippi': 'M 490 390 L 550 390 L 550 460 L 490 460 Z',
  // Arkansas
  'Arkansas': 'M 490 335 L 550 335 L 550 385 L 490 385 Z',
  // Louisiana
  'Louisiana': 'M 490 465 L 550 465 L 560 530 L 490 530 Z',
  // Oklahoma
  'Oklahoma': 'M 375 250 L 470 250 L 470 330 L 375 330 Z',
  // Texas
  'Texas': 'M 375 335 L 485 335 L 485 470 L 375 470 Z',
  // Alaska (scaled down, bottom-left)
  'Alaska': 'M 30 500 L 200 500 L 200 580 L 30 580 Z',
  // Hawaii (small, bottom-left)
  'Hawaii': 'M 210 520 L 300 520 L 300 570 L 210 570 Z',
};
