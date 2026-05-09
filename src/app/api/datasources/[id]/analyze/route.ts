import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractSchema, generateSchemaDescription, generateSampleDataDescription } from '@/lib/sqlite';
import { analyzeSchemaWithContext } from '@/lib/ai';
import { requireAuth, verifyOwnership } from '@/lib/auth-utils';

// Timeout wrapper — rejects if the promise takes longer than `ms` milliseconds
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

// POST /api/datasources/[id]/analyze - Run AI analysis on a data source
// This is called separately after upload so it doesn't block the upload response.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await requireAuth();

    const datasource = await db.dataSource.findUnique({
      where: { id },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Verify ownership
    const isOwner = await verifyOwnership(datasource.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Already analyzing or ready? Skip re-analysis
    if (datasource.status === 'analyzing') {
      return NextResponse.json({ datasource, message: 'Already analyzing' });
    }

    // Update status
    await db.dataSource.update({
      where: { id },
      data: { status: 'analyzing', errorMessage: null },
    });

    // Extract schema (with timeout)
    const schemaResult = await withTimeout(
      extractSchema(datasource.filePath),
      15000,
      'Schema extraction'
    );
    const schemaDescription = generateSchemaDescription(schemaResult.tables);
    const sampleDescription = generateSampleDataDescription(schemaResult.tables);

    // Delete existing schemas and contexts (re-analyze from scratch)
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

    // Run AI analysis (with 60s timeout)
    let analysisSucceeded = false;
    try {
      const analysis = await withTimeout(
        analyzeSchemaWithContext(schemaDescription, sampleDescription),
        60000,
        'AI analysis'
      );

      await db.sourceContext.create({
        data: {
          dataSourceId: id,
          semanticContext: analysis.semanticContext,
          businessGlossary: JSON.stringify(analysis.businessGlossary),
          relationships: JSON.stringify(analysis.relationships),
          summary: analysis.summary,
        },
      });
      analysisSucceeded = true;
    } catch (aiError) {
      console.warn('AI analysis failed (non-critical, schema still usable):', aiError instanceof Error ? aiError.message : aiError);
      // AI analysis failure is NOT critical — the data source is still usable
      // Create a minimal context so the summary shows something useful
      await db.sourceContext.create({
        data: {
          dataSourceId: id,
          semanticContext: 'Schema analysis pending. You can still query your data — the AI context will enhance future queries.',
          businessGlossary: '{}',
          relationships: '[]',
          summary: `Database with ${schemaResult.tables.length} tables uploaded successfully. AI analysis will be available shortly.`,
        },
      });
    }

    // Update status to ready
    await db.dataSource.update({
      where: { id },
      data: {
        status: 'ready',
        errorMessage: analysisSucceeded ? null : 'AI context generation timed out — data is still queryable',
      },
    });

    const result = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });

    return NextResponse.json({ datasource: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error analyzing datasource:', error);

    // Try to update status to error
    try {
      await db.dataSource.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Analysis failed',
        },
      });
    } catch { /* ignore DB update errors */ }

    return NextResponse.json({ error: 'Failed to analyze data source' }, { status: 500 });
  }
}
