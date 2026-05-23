/**
 * Convert amCharts GeoJSON to SVG paths for DataMind maps.
 * Uses Mercator projection to match the US map format.
 * 
 * Usage: node scripts/convert-geojson.js <country-code>
 * Output: writes to scripts/output/<country-code>-map-data.json
 */

const fs = require('fs');
const path = require('path');

// Country configurations
const COUNTRIES = {
  MX: {
    file: 'mexicoLow',
    name: 'México',
    nameEn: 'Mexico',
    regionLabel: 'estados',
    regionLabelEn: 'states',
    idPrefix: 'MX-',
  },
  BR: {
    file: 'brazilLow',
    name: 'Brasil',
    nameEn: 'Brazil',
    regionLabel: 'estados',
    regionLabelEn: 'states',
    idPrefix: 'BR-',
  },
  AR: {
    file: 'argentinaLow',
    name: 'Argentina',
    nameEn: 'Argentina',
    regionLabel: 'provincias',
    regionLabelEn: 'provinces',
    idPrefix: 'AR-',
  },
  CL: {
    file: 'chileLow',
    name: 'Chile',
    nameEn: 'Chile',
    regionLabel: 'regiones',
    regionLabelEn: 'regions',
    idPrefix: 'CL-',
  },
  CO: {
    file: 'colombiaLow',
    name: 'Colombia',
    nameEn: 'Colombia',
    regionLabel: 'departamentos',
    regionLabelEn: 'departments',
    idPrefix: 'CO-',
  },
  PE: {
    file: 'peruLow',
    name: 'Perú',
    nameEn: 'Peru',
    regionLabel: 'departamentos',
    regionLabelEn: 'departments',
    idPrefix: 'PE-',
  },
  ES: {
    file: 'spain2Low',
    name: 'España',
    nameEn: 'Spain',
    regionLabel: 'comunidades autónomas',
    regionLabelEn: 'autonomous communities',
    idPrefix: 'ES-',
  },
};

// ── Mercator Projection ──────────────────────────────────────

function mercatorX(lon) {
  return lon * 20037508.34 / 180;
}

function mercatorY(lat) {
  const rad = lat * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2)) * 20037508.34 / Math.PI;
}

function projectCoordinate(lon, lat) {
  return {
    x: mercatorX(lon),
    y: -mercatorY(lat)  // SVG Y is inverted
  };
}

// ── SVG Path Generation ──────────────────────────────────────

function ringToSvgPath(ring) {
  if (!ring || ring.length === 0) return '';
  const parts = [];
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    const { x, y } = projectCoordinate(lon, lat);
    if (i === 0) {
      parts.push(`M${x.toFixed(2)},${y.toFixed(2)}`);
    } else {
      parts.push(`L${x.toFixed(2)},${y.toFixed(2)}`);
    }
  }
  parts.push('Z');
  return parts.join('');
}

function polygonToSvgPath(coordinates) {
  // coordinates is an array of rings (outer ring + holes)
  // For map display, we only use the outer ring for simplicity
  return ringToSvgPath(coordinates[0]);
}

function multiPolygonToSvgPath(coordinates) {
  // coordinates is an array of polygons
  return coordinates.map(poly => polygonToSvgPath(poly)).join('');
}

function featureToSvgPath(feature) {
  const geom = feature.geometry;
  if (!geom) return null;
  
  switch (geom.type) {
    case 'Polygon':
      return polygonToSvgPath(geom.coordinates);
    case 'MultiPolygon':
      return multiPolygonToSvgPath(geom.coordinates);
    default:
      console.warn(`  Skipping ${feature.properties?.name}: unsupported geometry type "${geom.type}"`);
      return null;
  }
}

// ── Name Aliases ─────────────────────────────────────────────

const ALIAS_MAP = {
  MX: {
    'Ciudad de México': ['cdmx', 'distrito federal', 'df', 'mexico d.f.', 'mexico df', 'ciudad de mexico'],
    'México': ['estado de mexico', 'edomex', 'edo. mex'],
    'Nuevo León': ['nuevo leon', 'n.l.'],
    'Quintana Roo': ['q.r.'],
    'Baja California': ['b.c.'],
    'Baja California Sur': ['b.c.s.'],
    'Coahuila': ['coahuila de zaragoza'],
    'Michoacán': ['michoacan', 'michoacán de ocampo'],
    'Veracruz': ['veracruz de ignacio de la llave'],
    'Puebla': [],
    'Querétaro': ['queretaro'],
    'Yucatán': ['yucatan'],
    'Chiapas': [],
    'Oaxaca': ['oaxaca de juárez'],
    'Guerrero': [],
    'Tamaulipas': [],
    'Sinaloa': [],
    'Sonora': [],
    'Chihuahua': [],
    'Jalisco': [],
    'Guanajuato': [],
    'Aguascalientes': [],
    'Colima': [],
    'Durango': [],
    'Nayarit': [],
    'San Luis Potosí': ['san luis potosi'],
    'Tabasco': [],
    'Zacatecas': [],
    'Campeche': [],
    'Hidalgo': [],
    'Morelos': [],
    'Tlaxcala': [],
  },
  BR: {
    'São Paulo': ['sao paulo'],
    'Rio de Janeiro': ['rio de janeiro'],
    'Minas Gerais': [],
    'Bahia': [],
    'Paraná': ['parana'],
    'Rio Grande do Sul': [],
    'Pernambuco': [],
    'Ceará': ['ceara'],
    'Pará': ['para'],
    'Maranhão': ['maranhao'],
    'Santa Catarina': [],
    'Goiás': ['goias'],
    'Amazonas': [],
    'Paraíba': ['paraiba'],
    'Espírito Santo': ['espirito santo'],
    'Rio Grande do Norte': [],
    'Mato Grosso': [],
    'Alagoas': [],
    'Piauí': ['piaui'],
    'Mato Grosso do Sul': [],
    'Distrito Federal': ['brasilia'],
    'Sergipe': [],
    'Rondônia': ['rondonia'],
    'Tocantins': [],
    'Acre': [],
    'Amapá': ['amapa'],
    'Roraima': [],
  },
  AR: {
    'Buenos Aires': ['ba', 'bs as', 'bs. as.', 'provincia de buenos aires'],
    'Ciudad Autónoma de Buenos Aires': ['caba', 'capital federal', 'ciudad de buenos aires'],
    'Córdoba': ['cordoba'],
    'Santa Fe': [],
    'Mendoza': [],
    'Tucumán': ['tucuman'],
    'Entre Ríos': ['entre rios'],
    'Salta': [],
    'Misiones': [],
    'Chaco': [],
    'Corrientes': [],
    'Santiago del Estero': [],
    'Jujuy': [],
    'San Juan': [],
    'Catamarca': [],
    'La Rioja': [],
    'Formosa': [],
    'Neuquén': ['neuquen'],
    'Río Negro': ['rio negro'],
    'Chubut': [],
    'Santa Cruz': [],
    'Tierra del Fuego': ['tierra del fuego, antártida e islas del atlántico sur'],
    'San Luis': [],
    'La Pampa': [],
  },
  CL: {
    'Metropolitana': ['region metropolitana', 'rm', 'santiago'],
    'Valparaíso': ['valparaiso'],
    'Biobío': ['biobio'],
    'Maule': [],
    'Araucanía': ['araucania'],
    'O\'Higgins': ['ohiggins', "libertador general bernardo o'higgins"],
    'Los Lagos': [],
    'Coquimbo': [],
    'Los Ríos': ['los rios'],
    'Arica y Parinacota': ['arica'],
    'Tarapacá': ['tarapaca'],
    'Antofagasta': [],
    'Atacama': [],
    'Aysén': ['aysen'],
    'Magallanes': ['magallanes y de la antártica chilena'],
    'Ñuble': ['nuble'],
  },
  CO: {
    'Cundinamarca': [],
    'Antioquia': [],
    'Valle del Cauca': ['valle'],
    'Santander': [],
    'Nariño': ['narino'],
    'Boyacá': ['boyaca'],
    'Córdoba': [],
    'Tolima': [],
    'Cauca': [],
    'Atlántico': ['atlantico'],
    'Bolívar': ['bolivar'],
    'Magdalena': [],
    'Caquetá': ['caqueta'],
    'Cesar': [],
    'Huila': [],
    'Meta': [],
    'Norte de Santander': [],
    'Sucre': [],
    'Guaviare': [],
    'Chocó': ['choco'],
    'Arauca': [],
    'Casanare': [],
    'La Guajira': ['guajira'],
    'Putumayo': [],
    'Quindío': ['quindio'],
    'Caldas': [],
    'Risaralda': [],
    'Amazonas': [],
    'Guainía': ['guainia'],
    'Vaupés': ['vaupes'],
    'Vichada': [],
    'San Andrés': ['san andres y providencia', 'san andrés y providencia'],
    'Bogotá': ['bogota d.c.', 'bogota dc', 'distrito capital'],
  },
  PE: {
    'Lima': ['lima metropolitana', 'departamento de lima'],
    'Piura': [],
    'La Libertad': [],
    'Cajamarca': [],
    'Puno': [],
    'Junín': ['junin'],
    'Cusco': [],
    'Áncash': ['ancash'],
    'Arequipa': [],
    'Lambayeque': [],
    'Ayacucho': [],
    'Huánuco': ['huanuco'],
    'Ica': [],
    'Loreto': [],
    'San Martín': ['san martin'],
    'Apurímac': ['apurimac'],
    'Pasco': [],
    'Tacna': [],
    'Moquegua': [],
    'Tumbes': [],
    'Amazonas': [],
    'Ucayali': [],
    'Madre de Dios': [],
    'Huancavelica': [],
    'Callao': ['provincia constitucional del callao'],
  },
  ES: {
    'Andalucía': ['andalucia'],
    'Cataluña': ['cataluna', 'catalunya'],
    'Comunidad de Madrid': ['madrid'],
    'Comunitat Valenciana': ['comunidad valenciana', 'valencia'],
    'Galicia': [],
    'Castilla y León': ['castilla y leon'],
    'País Vasco': ['pais vasco', 'euskadi'],
    'Canarias': ['islas canarias'],
    'Castilla-La Mancha': ['castilla la mancha'],
    'Región de Murcia': ['region de murcia', 'murcia'],
    'Aragón': ['aragon'],
    'Extremadura': [],
    'Illes Balears': ['islas baleares', 'baleares'],
    'Asturias': ['principado de asturias'],
    'Navarra': ['comunidad foral de navarra'],
    'Cantabria': [],
    'La Rioja': [],
    'Ceuta': [],
    'Melilla': [],
  },
};

// ── Main Conversion Logic ────────────────────────────────────

function convertCountry(countryCode) {
  const config = COUNTRIES[countryCode];
  if (!config) {
    console.error(`Unknown country: ${countryCode}`);
    console.error(`Available: ${Object.keys(COUNTRIES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Converting ${config.name} (${countryCode})`);
  console.log(`${'='.repeat(60)}`);

  // Load GeoJSON from amCharts
  const geoPath = path.join(
    __dirname, '..', 'node_modules', '@amcharts', 'amcharts5-geodata',
    `${config.file}.js`
  );

  if (!fs.existsSync(geoPath)) {
    console.error(`GeoJSON file not found: ${geoPath}`);
    process.exit(1);
  }

  // Parse the amCharts JS file
  let geoJson;
  try {
    const content = fs.readFileSync(geoPath, 'utf8');
    // The file format: const map = { "type": "FeatureCollection", ... }; module.exports = map;
    // Extract the JSON object
    const mapMatch = content.match(/const map = (\{[\s\S]*?\});\s*\n/);
    if (mapMatch) {
      geoJson = JSON.parse(mapMatch[1]);
    } else {
      // Try executing as module
      const tempFile = path.join(__dirname, '_temp_geo.js');
      const moduleCode = content.replace(/^const map = /, 'module.exports = ');
      fs.writeFileSync(tempFile, moduleCode);
      // Clear require cache
      delete require.cache[require.resolve(tempFile)];
      geoJson = require(tempFile);
      fs.unlinkSync(tempFile);
    }
  } catch (err) {
    console.error(`Failed to parse GeoJSON: ${err.message}`);
    process.exit(1);
  }

  const features = geoJson.features || [];
  console.log(`Found ${features.length} features in GeoJSON\n`);

  // Convert each feature to an SVG path
  const regions = [];
  const paths = {};
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const feature of features) {
    const name = feature.properties?.name;
    if (!name) {
      console.warn(`  Skipping feature without name`);
      continue;
    }

    const svgPath = featureToSvgPath(feature);
    if (!svgPath) continue;

    // Get aliases for this region
    const aliases = ALIAS_MAP[countryCode]?.[name] || [];

    // Get ISO id
    const id = feature.id || feature.properties?.id || `${config.idPrefix}${name.toUpperCase().replace(/\s+/g, '')}`;

    regions.push({
      name,
      id,
      aliases,
    });

    paths[name] = svgPath;

    // Compute bounding box by parsing the path
    const coordPattern = /([ML])\s*([\d.-]+)\s*,\s*([\d.-]+)/g;
    let match;
    while ((match = coordPattern.exec(svgPath)) !== null) {
      const x = parseFloat(match[2]);
      const y = parseFloat(match[3]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    console.log(`  ✓ ${name} (${id})`);
  }

  // Add padding to viewBox
  const pad = (maxX - minX) * 0.02;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = (maxX - minX) + pad * 2;
  const vbH = (maxY - minY) + pad * 2;

  const viewBox = `${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`;

  console.log(`\nViewBox: ${viewBox}`);
  console.log(`Regions: ${regions.length}`);
  console.log(`Paths: ${Object.keys(paths).length}`);

  // Output data
  const output = {
    countryCode,
    name: config.name,
    nameEn: config.nameEn,
    regionLabel: config.regionLabel,
    regionLabelEn: config.regionLabelEn,
    viewBox,
    regions,
    paths,
  };

  // Ensure output dir exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${countryCode.toLowerCase()}-map-data.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten to: ${outputPath}`);

  return output;
}

// ── Run ──────────────────────────────────────────────────────

const targetCountry = process.argv[2];

if (targetCountry === 'all') {
  for (const code of Object.keys(COUNTRIES)) {
    convertCountry(code);
  }
} else if (targetCountry) {
  convertCountry(targetCountry.toUpperCase());
} else {
  console.log('Usage: node scripts/convert-geojson.js <country-code|all>');
  console.log(`Available countries: ${Object.keys(COUNTRIES).join(', ')}`);
  process.exit(1);
}
