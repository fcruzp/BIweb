import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSchemaDescription, generateSampleDataDescription } from '@/lib/sqlite';
import { analyzeSchemaWithContext } from '@/lib/ai';
import { requireAuth, verifyOwnership } from '@/lib/auth-utils';

// Timeout wrapper — rejects if the promise takes longer than `ms` milliseconds
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// POST /api/datasources/[id]/analyze - Run AI analysis on a data source
// This is called separately after upload so it doesn't block the upload response.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const startTime = Date.now();
  console.log(`[Analyze] Starting analysis for datasource ${id}`);

  try {
    await requireAuth();

    const datasource = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Verify ownership
    const isOwner = await verifyOwnership(datasource.userId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Already analyzing? Skip re-analysis
    if (datasource.status === 'analyzing') {
      console.log(`[Analyze] Datasource ${id} already analyzing, skipping`);
      return NextResponse.json({ datasource, message: 'Already analyzing' });
    }

    // Already has AI context? Skip re-analysis
    if (datasource.contexts.length > 0 && datasource.status === 'ready') {
      console.log(`[Analyze] Datasource ${id} already has context and is ready, skipping`);
      return NextResponse.json({ datasource, message: 'Already analyzed' });
    }

    // Update status
    await db.dataSource.update({
      where: { id },
      data: { status: 'analyzing', errorMessage: null },
    });

    // ──────────────────────────────────────────────────────────
    // Use existing schemas from DB (already extracted during upload)
    // This avoids re-opening the SQLite file and potential errors
    // ──────────────────────────────────────────────────────────
    if (datasource.schemas.length === 0) {
      console.warn(`[Analyze] Datasource ${id} has no schemas — cannot analyze`);
      await db.dataSource.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: 'No schema information found. Please re-upload the file.',
        },
      });
      return NextResponse.json({ error: 'No schema information found' }, { status: 400 });
    }

    console.log(`[Analyze] Using ${datasource.schemas.length} existing schemas for datasource ${id}`);

    // Build schema descriptions from existing DB records (no file access needed!)
    const tables = datasource.schemas.map((s) => ({
      name: s.tableName,
      columns: JSON.parse(s.columns),
      rowCount: s.rowCount,
      sampleData: JSON.parse(s.sampleData),
    }));
    const schemaDescription = generateSchemaDescription(tables);
    const sampleDescription = generateSampleDataDescription(tables);

    // Delete existing contexts (re-analyze from scratch)
    await db.sourceContext.deleteMany({ where: { dataSourceId: id } });

    // Run AI analysis (with 45s timeout)
    let analysisSucceeded = false;
    try {
      console.log(`[Analyze] Starting AI analysis for datasource ${id}...`);
      const analysis = await withTimeout(
        analyzeSchemaWithContext(schemaDescription, sampleDescription),
        45000,
        'AI analysis'
      );
      console.log(`[Analyze] AI analysis completed for datasource ${id} in ${Date.now() - startTime}ms`);

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
      console.warn(`[Analyze] AI analysis failed for datasource ${id} (non-critical):`, aiError instanceof Error ? aiError.message : aiError);
      // AI analysis failure is NOT critical — the data source is still usable
      // Create a minimal context so the summary shows something useful
      await db.sourceContext.create({
        data: {
          dataSourceId: id,
          semanticContext: 'Schema analysis pending. You can still query your data — the AI context will enhance future queries.',
          businessGlossary: '{}',
          relationships: '[]',
          summary: `Database with ${datasource.schemas.length} tables uploaded successfully. AI analysis will be available shortly.`,
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

    console.log(`[Analyze] Datasource ${id} analysis complete (success: ${analysisSucceeded}, total: ${Date.now() - startTime}ms)`);

    const result = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });

    return NextResponse.json({ datasource: result });
  } catch (error) {
    console.error(`[Analyze] ERROR analyzing datasource ${id}:`, error);

    // Try to update status to error — CRITICAL: don't leave it stuck at 'analyzing'
    try {
      await db.dataSource.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Analysis failed',
        },
      });
    } catch (dbError) {
      console.error(`[Analyze] Failed to update error status for datasource ${id}:`, dbError);
    }

    return NextResponse.json({ error: 'Failed to analyze data source' }, { status: 500 });
  }
}
