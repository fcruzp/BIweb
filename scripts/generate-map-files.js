/**
 * Generate TypeScript map files from converted GeoJSON data.
 * Reads from scripts/output/*.json and writes to src/lib/maps/.
 * 
 * Usage: node scripts/generate-map-files.js
 */

const fs = require('fs');
const path = require('path');

// Name mappings: amCharts name → standard name used in DataMind
const NAME_MAPPINGS = {
  CL: {
    'Libertador General Bernardo O\'Higgins': "O'Higgins",
    'Región Metropolitana de Santiago': 'Metropolitana',
    'La Araucanía': 'Araucanía',
    'Aisén del General Carlos Ibañez del Campo': 'Aysén',
    'Magallanes and Chilean Antarctica Región': 'Magallanes',
  },
  CO: {
    'San Andrés, Providencia y Santa Catalina': 'San Andrés',
    'Distrito Capital de Bogotá': 'Bogotá',
    'Norde de Santander': 'Norte de Santander',
    'Quindio': 'Quindío',
    'Guainia': 'Guainía',
    'Vaupés': 'Vaupés',
  },
  PE: {
    'El Callao': 'Callao',
    'Lima Province': 'Lima Provincia',
    'Lake Titicaca': null, // Skip - it's a lake
    'Ancash': 'Áncash',
    'Apurimac': 'Apurímac',
    'Junin': 'Junín',
    'San Martin': 'San Martín',
    'Huánuco': 'Huánuco',
  },
  AR: {
    'Cordoba': 'Córdoba',
    'Ciudad de Buenos Aires': 'Ciudad Autónoma de Buenos Aires',
  },
  ES: {
    'Valenciana': 'Comunitat Valenciana',
    'Islas Baleares': 'Illes Balears',
  },
};

// Additional aliases to add (merged with conversion script aliases)
const EXTRA_ALIASES = {
  MX: {
    'Aguascalientes': ['ags'],
    'Baja California': ['baja california norte', 'bc', 'bcn'],
    'Campeche': ['camp'],
    'Chiapas': ['chis'],
    'Chihuahua': ['chih'],
    'Ciudad de México': ['cdmx', 'distrito federal', 'df', 'mexico city'],
    'Coahuila': ['coahuila de zaragoza', 'coah'],
    'Colima': ['col'],
    'Durango': ['dgo'],
    'Guanajuato': ['gto'],
    'Guerrero': ['gro'],
    'Hidalgo': ['hgo'],
    'Jalisco': ['jal'],
    'México': ['estado de méxico', 'edomex', 'edoméx'],
    'Michoacán': ['michoacán de ocampo', 'mich'],
    'Morelos': ['mor'],
    'Nayarit': ['nay'],
    'Nuevo León': ['n.l.', 'nl'],
    'Oaxaca': ['oax'],
    'Puebla': ['pue'],
    'Querétaro': ['qro'],
    'Quintana Roo': ['q.roo', 'qr'],
    'San Luis Potosí': ['slp'],
    'Sinaloa': ['sin'],
    'Sonora': ['son'],
    'Tabasco': ['tab'],
    'Tamaulipas': ['tamps'],
    'Tlaxcala': ['tlax'],
    'Veracruz': ['veracruz de ignacio de la llave', 'ver'],
    'Yucatán': ['yuc'],
    'Zacatecas': ['zac'],
  },
  BR: {
    'São Paulo': ['sp'],
    'Rio de Janeiro': ['rj'],
    'Minas Gerais': ['mg'],
    'Bahia': ['ba'],
    'Paraná': ['pr'],
    'Rio Grande do Sul': ['rs'],
    'Pernambuco': ['pe'],
    'Ceará': ['ce'],
    'Pará': ['pa'],
    'Maranhão': ['ma'],
    'Santa Catarina': ['sc'],
    'Goiás': ['go'],
    'Amazonas': ['am'],
    'Paraíba': ['pb'],
    'Espírito Santo': ['es'],
    'Rio Grande do Norte': ['rn'],
    'Mato Grosso': ['mt'],
    'Alagoas': ['al'],
    'Piauí': ['pi'],
    'Mato Grosso do Sul': ['ms'],
    'Distrito Federal': ['df', 'brasilia'],
    'Sergipe': ['se'],
    'Rondônia': ['ro'],
    'Tocantins': ['to'],
    'Acre': ['ac'],
    'Amapá': ['ap'],
    'Roraima': ['rr'],
  },
  AR: {
    'Buenos Aires': ['bs as', 'bs. as.', 'provincia de buenos aires'],
    'Ciudad Autónoma de Buenos Aires': ['caba', 'capital federal', 'ciudad de buenos aires'],
    'Córdoba': ['cordoba'],
    'Tucumán': ['tucuman'],
    'Entre Ríos': ['entre rios'],
    'Neuquén': ['neuquen'],
    'Río Negro': ['rio negro'],
    'Tierra del Fuego': ['tierra del fuego, antártida e islas del atlántico sur'],
  },
  CL: {
    "O'Higgins": ["ohiggins", "libertador general bernardo o'higgins"],
    'Metropolitana': ['region metropolitana', 'rm', 'santiago', 'región metropolitana de santiago'],
    'Araucanía': ['araucania', 'la araucanía'],
    'Aysén': ['aisén', 'aysen'],
    'Magallanes': ['magallanes y de la antártica chilena'],
    'Valparaíso': ['valparaiso'],
    'Biobío': ['biobio'],
    'Los Ríos': ['los rios'],
    'Ñuble': ['nuble'],
    'Tarapacá': ['tarapaca'],
  },
  CO: {
    'Bogotá': ['bogota d.c.', 'bogota dc', 'distrito capital', 'distrito capital de bogotá'],
    'San Andrés': ['san andrés y providencia', 'san andres y providencia'],
    'Nariño': ['narino'],
    'Boyacá': ['boyaca'],
    'Chocó': ['choco'],
    'Caquetá': ['caqueta'],
    'Quindío': ['quindio'],
    'Guainía': ['guainia'],
    'Vaupés': ['vaupes'],
    'Bolívar': ['bolivar'],
    'Atlántico': ['atlantico'],
    'Córdoba': ['cordoba'],
    'La Guajira': ['guajira'],
  },
  PE: {
    'Lima': ['lima metropolitana', 'departamento de lima'],
    'Áncash': ['ancash'],
    'Apurímac': ['apurimac'],
    'Junín': ['junin'],
    'San Martín': ['san martin'],
    'Huánuco': ['huanuco'],
    'Callao': ['provincia constitucional del callao', 'el callao'],
    'Lima Provincia': ['lima provincia', 'provincia de lima'],
  },
  ES: {
    'Andalucía': ['andalucia'],
    'Cataluña': ['cataluna', 'catalunya'],
    'Comunidad de Madrid': ['madrid'],
    'Comunitat Valenciana': ['comunidad valenciana', 'valencia'],
    'País Vasco': ['pais vasco', 'euskadi'],
    'Canarias': ['islas canarias'],
    'Castilla-La Mancha': ['castilla la mancha'],
    'Castilla y León': ['castilla y leon'],
    'Región de Murcia': ['region de murcia', 'murcia'],
    'Aragón': ['aragon'],
    'Illes Balears': ['islas baleares', 'baleares'],
    'Asturias': ['principado de asturias'],
    'Navarra': ['comunidad foral de navarra'],
  },
};

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'lib', 'maps');

function generateMapFile(countryCode) {
  const inputPath = path.join(__dirname, 'output', `${countryCode.toLowerCase()}-map-data.json`);
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const mappings = NAME_MAPPINGS[countryCode] || {};
  const extraAliases = EXTRA_ALIASES[countryCode] || {};

  // Process regions and paths
  const regions = [];
  const pathEntries = [];

  for (const region of data.regions) {
    let name = region.name;
    
    // Apply name mapping
    if (mappings[name] === null) {
      console.log(`  Skipping: ${name}`);
      continue; // Skip this region
    }
    if (mappings[name]) {
      console.log(`  Renaming: ${region.name} → ${mappings[name]}`);
      name = mappings[name];
    }

    // Merge aliases: from conversion script + extra + lowercase of name
    const allAliases = new Set(region.aliases || []);
    if (extraAliases[name]) {
      for (const a of extraAliases[name]) allAliases.add(a);
    }
    // Remove duplicates (name itself shouldn't be an alias)
    allAliases.delete(name.toLowerCase());

    regions.push({
      name,
      id: region.id,
      aliases: Array.from(allAliases),
    });

    // Map the path using the NEW name
    if (data.paths[region.name]) {
      pathEntries.push({ name, path: data.paths[region.name] });
    }
  }

  // Generate TypeScript file
  const countryCodeLower = countryCode.toLowerCase();
  const regionConst = `${countryCode}_REGIONS`;
  const pathConst = `${countryCode}_PATHS`;

  let ts = `/**\n`;
  ts += ` * ${data.name} Map Data — Real SVG geographic boundaries\n`;
  ts += ` *\n`;
  ts += ` * Generated from amCharts geodata (Mercator projection)\n`;
  ts += ` * ViewBox: ${data.viewBox}\n`;
  ts += ` */\n\n`;
  ts += `import type { MapRegion } from '@/lib/map-registry';\n\n`;

  // Regions array
  ts += `export const ${regionConst}: MapRegion[] = [\n`;
  for (const r of regions) {
    const aliasesStr = r.aliases.length > 0
      ? r.aliases.map(a => `'${a.replace(/'/g, "\\'")}'`).join(', ')
      : '';
    ts += `  { name: '${r.name.replace(/'/g, "\\'")}', id: '${r.id}', aliases: [${aliasesStr}] },\n`;
  }
  ts += `];\n\n`;

  // Paths record
  ts += `/**\n * Real SVG paths for ${data.name} regions.\n`;
  ts += ` * ViewBox: ${data.viewBox}\n */\n`;
  ts += `export const ${pathConst}: Record<string, string> = {\n`;
  for (const p of pathEntries) {
    ts += `  '${p.name.replace(/'/g, "\\'")}': '${p.path}',\n`;
  }
  ts += `};\n`;

  const outputPath = path.join(OUTPUT_DIR, `${countryCodeLower}-map.ts`);
  fs.writeFileSync(outputPath, ts);
  console.log(`  ✓ Written: ${outputPath}`);
  console.log(`    Regions: ${regions.length}, Paths: ${pathEntries.length}`);
}

// ── Main ──────────────────────────────────────────────────────

console.log('Generating TypeScript map files...\n');

const countries = ['MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'ES'];
for (const code of countries) {
  console.log(`\n${code}:`);
  generateMapFile(code);
}

console.log('\n\nDone! All map files generated.');
