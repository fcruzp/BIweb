import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSchema, generateSchemaDescription, generateSampleDataDescription } from '@/lib/sqlite';
import { requireAuth } from '@/lib/auth-utils';
import { getDataDir } from '@/lib/file-utils';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// GET /api/datasources - List all data sources (filtered by authenticated user)
export async function GET() {
  try {
    const user = await requireAuth();

    const datasources = await db.dataSource.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        schemas: true,
        contexts: true,
      },
    });
    return NextResponse.json({ datasources });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error fetching datasources:', error);
    return NextResponse.json({ error: 'Failed to fetch data sources' }, { status: 500 });
  }
}

// POST /api/datasources - Upload a new SQLite file
// Returns immediately after saving file + extracting schema.
// AI analysis is triggered separately via POST /api/datasources/[id]/analyze
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

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

    // Ensure data directory exists
    const dataDir = getDataDir();

    // Save file to data directory
    const fileId = uuidv4();
    const storageFilename = `${fileId}_${file.name}`;
    const filePath = path.join(dataDir, storageFilename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    // Store ONLY the filename in the DB — resolve at runtime via resolveFilePath()
    // This ensures portability across deployments with different working directories
    const dataSource = await db.dataSource.create({
      data: {
        name,
        fileName: file.name,
        fileSize: buffer.length,
        filePath: storageFilename,  // Just the filename, not the full path
        fileType: 'sqlite',
        status: 'uploaded',
        userId: user.id,
      },
    });

    // Extract schema (fast, no AI needed)
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

      // Set status to "ready" immediately — schema is usable without AI analysis
      // AI context is optional enhancement, not required for basic queries
      await db.dataSource.update({
        where: { id: dataSource.id },
        data: { status: 'ready' },
      });
    } catch (schemaError) {
      console.error('Error extracting schema:', schemaError);
      await db.dataSource.update({
        where: { id: dataSource.id },
        data: {
          status: 'error',
          errorMessage: schemaError instanceof Error ? schemaError.message : 'Schema extraction failed',
        },
      });
    }

    // Return the updated data source (with schemas, no contexts yet)
    const result = await db.dataSource.findUnique({
      where: { id: dataSource.id },
      include: { schemas: true, contexts: true },
    });

    return NextResponse.json({ datasource: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error uploading datasource:', error);
    return NextResponse.json({ error: 'Failed to upload data source' }, { status: 500 });
  }
}
