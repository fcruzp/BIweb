import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSchema, generateSchemaDescription, generateSampleDataDescription } from '@/lib/sqlite';
import { analyzeSchemaWithContext } from '@/lib/ai';

// POST /api/datasources/[id]/analyze - Re-analyze a data source
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const datasource = await db.dataSource.findUnique({
      where: { id },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Update status
    await db.dataSource.update({
      where: { id },
      data: { status: 'analyzing' },
    });

    // Extract schema
    const schemaResult = extractSchema(datasource.filePath);
    const schemaDescription = generateSchemaDescription(schemaResult.tables);
    const sampleDescription = generateSampleDataDescription(schemaResult.tables);

    // Delete existing schemas and contexts
    await db.sourceSchema.deleteMany({ where: { dataSourceId: id } });
    await db.sourceContext.deleteMany({ where: { dataSourceId: id } });

    // Save schema information
    for (const table of schemaResult.tables) {
      await db.sourceSchema.create({
        data: {
          dataSourceId: id,
          tableName: table.name,
          columns: JSON.stringify(table.columns),
          rowCount: table.rowCount,
          sampleData: JSON.stringify(table.sampleData),
        },
      });
    }

    // Run AI analysis
    const analysis = await analyzeSchemaWithContext(schemaDescription, sampleDescription);

    await db.sourceContext.create({
      data: {
        dataSourceId: id,
        semanticContext: analysis.semanticContext,
        businessGlossary: JSON.stringify(analysis.businessGlossary),
        relationships: JSON.stringify(analysis.relationships),
        summary: analysis.summary,
      },
    });

    // Update status to ready
    await db.dataSource.update({
      where: { id },
      data: { status: 'ready' },
    });

    const result = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });

    return NextResponse.json({ datasource: result });
  } catch (error) {
    console.error('Error analyzing datasource:', error);
    await db.dataSource.update({
      where: { id },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Analysis failed',
      },
    });
    return NextResponse.json({ error: 'Failed to analyze data source' }, { status: 500 });
  }
}
