import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSchema, generateSchemaDescription, generateSampleDataDescription } from '@/lib/sqlite';
import { analyzeSchemaWithContext } from '@/lib/ai';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');

// GET /api/datasources - List all data sources
export async function GET() {
  try {
    const datasources = await db.dataSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        schemas: true,
        contexts: true,
      },
    });
    return NextResponse.json({ datasources });
  } catch (error) {
    console.error('Error fetching datasources:', error);
    return NextResponse.json({ error: 'Failed to fetch data sources' }, { status: 500 });
  }
}

// POST /api/datasources - Upload a new SQLite file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = (formData.get('name') as string) || file?.name || 'Untitled';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite') && !file.name.endsWith('.sqlite3')) {
      return NextResponse.json({ error: 'Only SQLite files (.db, .sqlite, .sqlite3) are supported' }, { status: 400 });
    }

    // Save file to data directory
    const fileId = uuidv4();
    const fileName = `${fileId}_${file.name}`;
    const filePath = path.join(DATA_DIR, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    // Create data source record
    const dataSource = await db.dataSource.create({
      data: {
        name,
        fileName: file.name,
        fileSize: buffer.length,
        filePath,
        fileType: 'sqlite',
        status: 'uploaded',
      },
    });

    // Extract schema
    try {
      const schemaResult = extractSchema(filePath);

      // Save schema information
      for (const table of schemaResult.tables) {
        await db.sourceSchema.create({
          data: {
            dataSourceId: dataSource.id,
            tableName: table.name,
            columns: JSON.stringify(table.columns),
            rowCount: table.rowCount,
            sampleData: JSON.stringify(table.sampleData),
          },
        });
      }

      // Update status to analyzing
      await db.dataSource.update({
        where: { id: dataSource.id },
        data: { status: 'analyzing' },
      });

      // Run AI analysis
      const schemaDescription = generateSchemaDescription(schemaResult.tables);
      const sampleDescription = generateSampleDataDescription(schemaResult.tables);

      const analysis = await analyzeSchemaWithContext(schemaDescription, sampleDescription);

      // Save context
      await db.sourceContext.create({
        data: {
          dataSourceId: dataSource.id,
          semanticContext: analysis.semanticContext,
          businessGlossary: JSON.stringify(analysis.businessGlossary),
          relationships: JSON.stringify(analysis.relationships),
          summary: analysis.summary,
        },
      });

      // Update status to ready
      await db.dataSource.update({
        where: { id: dataSource.id },
        data: { status: 'ready' },
      });
    } catch (analyzeError) {
      console.error('Error analyzing schema:', analyzeError);
      await db.dataSource.update({
        where: { id: dataSource.id },
        data: {
          status: 'error',
          errorMessage: analyzeError instanceof Error ? analyzeError.message : 'Analysis failed',
        },
      });
    }

    // Return the updated data source
    const result = await db.dataSource.findUnique({
      where: { id: dataSource.id },
      include: { schemas: true, contexts: true },
    });

    return NextResponse.json({ datasource: result }, { status: 201 });
  } catch (error) {
    console.error('Error uploading datasource:', error);
    return NextResponse.json({ error: 'Failed to upload data source' }, { status: 500 });
  }
}
