import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { resolveFilePath } from '@/lib/file-utils'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

/**
 * POST /api/onboarding/demo
 *
 * Creates a demo SQLite database for new users who selected "Load demo data"
 * during onboarding. The demo database contains sample e-commerce data from
 * the Dominican Republic that the user can immediately query.
 */
export async function POST() {
  try {
    const user = await requireAuth()

    // Check if user already has a demo data source
    const existingDemo = await db.dataSource.findFirst({
      where: {
        userId: user.id,
        fileName: 'demo_ecommerce_rd.sqlite',
      },
    })

    if (existingDemo) {
      return NextResponse.json({
        dataSourceId: existingDemo.id,
        message: 'Demo data already exists',
      })
    }

    // Create demo SQLite database
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
    const userDir = path.join(dataDir, user.id)
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true })
    }

    const dbPath = path.join(userDir, 'demo_ecommerce_rd.sqlite')
    const demoDb = new Database(dbPath)

    // Create demo tables
    demoDb.exec(`
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        precio REAL NOT NULL,
        costo REAL NOT NULL,
        stock INTEGER NOT NULL,
        provincia TEXT
      );

      CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        total REAL NOT NULL,
        fecha TEXT NOT NULL,
        provincia TEXT,
        canal TEXT DEFAULT 'tienda',
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      );

      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT,
        provincia TEXT,
        segmento TEXT DEFAULT 'regular',
        fecha_registro TEXT DEFAULT (date('now'))
      );
    `)

    // Insert demo products
    const insertProduct = demoDb.prepare(
      'INSERT INTO productos (nombre, categoria, precio, costo, stock, provincia) VALUES (?, ?, ?, ?, ?, ?)'
    )

    const products = [
      ['Laptop HP 15"', 'Electrónica', 35000, 25000, 45, 'Santo Domingo'],
      ['iPhone 15', 'Electrónica', 55000, 42000, 30, 'Santo Domingo'],
      ['Samsung Galaxy S24', 'Electrónica', 48000, 36000, 25, 'Santiago'],
      ['TV Samsung 55"', 'Electrónica', 42000, 30000, 20, 'Santo Domingo'],
      ['AirPods Pro', 'Electrónica', 12000, 8500, 60, 'Distrito Nacional'],
      ['Camiseta Polo', 'Ropa', 1500, 600, 200, 'Santo Domingo'],
      ['Jeans Levi\'s', 'Ropa', 2800, 1200, 150, 'Santiago'],
      ['Vestido Elegante', 'Ropa', 4500, 1800, 80, 'La Romana'],
      ['Zapatillas Nike', 'Ropa', 6500, 3000, 120, 'Santo Domingo'],
      ['Sofá 3 plazas', 'Hogar', 25000, 15000, 15, 'Santo Domingo'],
      ['Mesa de comedor', 'Hogar', 18000, 10000, 10, 'Santiago'],
      ['Lámpara LED', 'Hogar', 2500, 800, 100, 'Puerto Plata'],
      ['Cafetera Nespresso', 'Hogar', 8500, 4500, 40, 'Distrito Nacional'],
      ['Aceite de oliva 1L', 'Alimentos', 650, 350, 300, 'Santo Domingo'],
      ['Arroz 5kg', 'Alimentos', 350, 200, 500, 'San Pedro de Macorís'],
      ['Café Santo Domingo 1lb', 'Alimentos', 450, 250, 400, 'Santo Domingo'],
      ['Pelota de fútbol', 'Deportes', 1200, 500, 80, 'Santo Domingo'],
      ['Mancuernas 5kg par', 'Deportes', 2500, 1200, 50, 'Santiago'],
      ['Bicicleta de montaña', 'Deportes', 15000, 9000, 15, 'La Vega'],
      ['Yoga mat', 'Deportes', 800, 300, 100, 'Santo Domingo'],
    ]

    const insertManyProducts = demoDb.transaction((items) => {
      for (const item of items) {
        insertProduct.run(...item)
      }
    })
    insertManyProducts(products)

    // Insert demo sales (6 months of data)
    const insertSale = demoDb.prepare(
      'INSERT INTO ventas (producto_id, cantidad, total, fecha, provincia, canal) VALUES (?, ?, ?, ?, ?, ?)'
    )

    const provinces = ['Santo Domingo', 'Santiago', 'Distrito Nacional', 'La Romana', 'Puerto Plata', 'San Pedro de Macorís', 'La Vega']
    const channels = ['tienda', 'online', 'mayorista']

    const salesData: Parameters<typeof insertSale.run>[] = []
    for (let month = 1; month <= 6; month++) {
      for (let productId = 1; productId <= 20; productId++) {
        const product = products[productId - 1]
        const qty = Math.floor(Math.random() * 30) + 5
        const total = Math.round(product[2] * qty * (0.9 + Math.random() * 0.2))
        const day = Math.floor(Math.random() * 28) + 1
        const date = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const province = provinces[Math.floor(Math.random() * provinces.length)]
        const channel = channels[Math.floor(Math.random() * channels.length)]
        salesData.push([productId, qty, total, date, province, channel])
      }
    }

    const insertManySales = demoDb.transaction((items) => {
      for (const item of items) {
        insertSale.run(...item)
      }
    })
    insertManySales(salesData)

    // Insert demo clients
    const insertClient = demoDb.prepare(
      'INSERT INTO clientes (nombre, email, provincia, segmento) VALUES (?, ?, ?, ?)'
    )

    const clients = [
      ['María García', 'maria@email.com', 'Santo Domingo', 'premium'],
      ['Juan Pérez', 'juan@email.com', 'Santiago', 'regular'],
      ['Ana Rodríguez', 'ana@email.com', 'Distrito Nacional', 'premium'],
      ['Carlos Martínez', 'carlos@email.com', 'La Romana', 'regular'],
      ['Luisa Hernández', 'luisa@email.com', 'Santo Domingo', 'vip'],
      ['Pedro Sánchez', 'pedro@email.com', 'Puerto Plata', 'regular'],
      ['Rosa López', 'rosa@email.com', 'Santo Domingo', 'premium'],
      ['Miguel Torres', 'miguel@email.com', 'Santiago', 'regular'],
      ['Carmen Díaz', 'carmen@email.com', 'San Pedro de Macorís', 'vip'],
      ['José Ramírez', 'jose@email.com', 'La Vega', 'regular'],
    ]

    const insertManyClients = demoDb.transaction((items) => {
      for (const item of items) {
        insertClient.run(...item)
      }
    })
    insertManyClients(clients)

    demoDb.close()

    // Create data source record in our DB
    const dataSource = await db.dataSource.create({
      data: {
        userId: user.id,
        name: 'Demo: E-Commerce RD',
        fileName: 'demo_ecommerce_rd.sqlite',
        filePath: dbPath,
        fileSize: fs.statSync(dbPath).size,
        fileType: 'sqlite',
        status: 'ready',
      },
    })

    // Auto-create schema records
    const tables = ['productos', 'ventas', 'clientes']
    const demoDb2 = new Database(dbPath, { readonly: true })

    for (const tableName of tables) {
      const columnsInfo = demoDb2.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
        name: string; type: string; notnull: number; pk: number;
      }>
      const rowCount = (demoDb2.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }).count
      const sampleRows = demoDb2.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all() as Record<string, unknown>[]

      const columns = columnsInfo.map(col => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        isPrimaryKey: !!col.pk,
      }))

      await db.sourceSchema.create({
        data: {
          dataSourceId: dataSource.id,
          tableName,
          columns: JSON.stringify(columns),
          rowCount,
          sampleData: JSON.stringify(sampleRows),
        },
      })
    }

    demoDb2.close()

    // Auto-generate semantic context
    try {
      const { analyzeSchemaWithContext } = await import('@/lib/ai')
      const schemaInfo = tables.map(t => {
        const cols = demoDb2.prepare ? [] : []
        return `Table: ${t}`
      }).join('\n')

      const context = await analyzeSchemaWithContext(
        'Tables: productos (20 items), ventas (120 transactions), clientes (10 records). Dominican Republic e-commerce demo data.',
        'Sample: Products include electronics, clothing, home, food, sports. Sales span Jan-Jun 2025 across 7 provinces. Clients have segments: regular, premium, vip.',
      )

      await db.sourceContext.create({
        data: {
          dataSourceId: dataSource.id,
          semanticContext: context.semanticContext,
          businessGlossary: JSON.stringify(context.businessGlossary),
          relationships: JSON.stringify(context.relationships),
          summary: context.summary,
        },
      })
    } catch (aiError) {
      // Non-critical: AI context analysis can fail, DB still works
      console.warn('[onboarding/demo] AI context analysis failed (non-critical):', aiError instanceof Error ? aiError.message : aiError)

      // Create a basic context without AI
      await db.sourceContext.create({
        data: {
          dataSourceId: dataSource.id,
          semanticContext: 'Base de datos de demostración de e-commerce de República Dominicana. Contiene productos, ventas y clientes.',
          businessGlossary: JSON.stringify({
            productos: 'Catálogo de productos con categorías: Electrónica, Ropa, Hogar, Alimentos, Deportes',
            ventas: 'Registro de ventas con fecha, provincia, canal y monto',
            clientes: 'Base de clientes con segmentación: regular, premium, vip',
          }),
          relationships: JSON.stringify([
            { from: 'ventas.producto_id', to: 'productos.id', type: 'many-to-one', description: 'Cada venta corresponde a un producto' },
            { from: 'ventas.provincia', to: 'clientes.provincia', type: 'many-to-many', description: 'Ventas y clientes comparten provincias' },
          ]),
          summary: 'Base de datos demo de e-commerce RD con 20 productos, 120 ventas (Ene-Jun 2025), y 10 clientes. Incluye datos por provincia para mapas geográficos.',
        },
      })
    }

    return NextResponse.json({
      dataSourceId: dataSource.id,
      message: 'Demo data created successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    console.error('[onboarding/demo] Error:', error)
    return NextResponse.json({ error: 'Failed to create demo data' }, { status: 500 })
  }
}
