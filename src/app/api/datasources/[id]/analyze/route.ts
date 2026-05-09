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

/**
 * Safely serialize an error for JSON responses and console logging.
 * Handles Error instances, plain objects, and unknown types.
 */
function serializeError(error: unknown): { message: string; stack?: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack, name: error.name };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { message: String(error) };
}

// POST /api/datasources/[id]/analyze - Run AI analysis on a data source
// This is called separately after upload so it doesn't block the upload response.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const startTime = Date.now();
  console.log(`[Analyze] === START === datasource=${id}`);

  try {
    console.log('[Analyze] Step 1: Checking auth...');
    await requireAuth();
    console.log('[Analyze] Step 1: Auth OK');

    console.log('[Analyze] Step 2: Fetching datasource from DB...');
    const datasource = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });

    if (!datasource) {
      console.log('[Analyze] Step 2: Datasource NOT FOUND');
      return NextResponse.json({ error: 'Data source not found', detail: `No datasource with id=${id}` }, { status: 404 });
    }

    console.log(`[Analyze] Step 2: Found datasource: name="${datasource.name}", status="${datasource.status}", schemas=${datasource.schemas.length}, contexts=${datasource.contexts.length}, filePath="${datasource.filePath}"`);

    // Verify ownership
    const isOwner = await verifyOwnership(datasource.userId);
    if (!isOwner) {
      console.log('[Analyze] Ownership check FAILED');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Already analyzing? Skip re-analysis
    if (datasource.status === 'analyzing') {
      console.log(`[Analyze] Status is 'analyzing' — skipping (already in progress)`);
      return NextResponse.json({ datasource, message: 'Already analyzing' });
    }

    // Already has AI context? Skip re-analysis
    if (datasource.contexts.length > 0 && datasource.status === 'ready') {
      console.log(`[Analyze] Already has context and status=ready — skipping`);
      return NextResponse.json({ datasource, message: 'Already analyzed' });
    }

    // Update status
    console.log('[Analyze] Step 3: Setting status to "analyzing"...');
    await db.dataSource.update({
      where: { id },
      data: { status: 'analyzing', errorMessage: null },
    });

    // ──────────────────────────────────────────────────────────
    // Use existing schemas from DB (already extracted during upload)
    // This avoids re-opening the SQLite file and potential errors
    // ──────────────────────────────────────────────────────────
    if (datasource.schemas.length === 0) {
      console.warn(`[Analyze] Datasource has NO schemas — cannot analyze. Setting status to error.`);
      await db.dataSource.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: 'No schema information found. Please re-upload the file.',
        },
      });
      return NextResponse.json({
        error: 'No schema information found',
        detail: `Datasource ${id} has 0 schemas. The file may not have been processed correctly during upload. Try re-uploading.`,
      }, { status: 400 });
    }

    console.log(`[Analyze] Step 4: Building schema description from ${datasource.schemas.length} existing schemas...`);

    // Build schema descriptions from existing DB records (no file access needed!)
    const tables = datasource.schemas.map((s) => ({
      name: s.tableName,
      columns: JSON.parse(s.columns),
      rowCount: s.rowCount,
      sampleData: JSON.parse(s.sampleData),
    }));
    const schemaDescription = generateSchemaDescription(tables);
    const sampleDescription = generateSampleDataDescription(tables);
    console.log(`[Analyze] Step 4: Schema description built (${schemaDescription.length} chars)`);

    // Delete existing contexts (re-analyze from scratch)
    console.log('[Analyze] Step 5: Deleting old contexts...');
    await db.sourceContext.deleteMany({ where: { dataSourceId: id } });

    // Run AI analysis (with 45s timeout)
    let analysisSucceeded = false;
    try {
      console.log('[Analyze] Step 6: Calling AI analyzeSchemaWithContext (timeout: 45s)...');
      const analysis = await withTimeout(
        analyzeSchemaWithContext(schemaDescription, sampleDescription),
        45000,
        'AI analysis'
      );
      console.log(`[Analyze] Step 6: AI analysis completed in ${Date.now() - startTime}ms`);

      console.log('[Analyze] Step 7: Saving AI context to DB...');
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
      console.log('[Analyze] Step 7: AI context saved OK');
    } catch (aiError) {
      const errInfo = serializeError(aiError);
      console.warn(`[Analyze] Step 6 FAILED: AI analysis error (non-critical):`, errInfo);
      // AI analysis failure is NOT critical — the data source is still usable
      // Create a minimal context so the summary shows something useful
      console.log('[Analyze] Step 7 (fallback): Saving minimal context...');
      await db.sourceContext.create({
        data: {
          dataSourceId: id,
          semanticContext: 'Schema analysis pending. You can still query your data — the AI context will enhance future queries.',
          businessGlossary: '{}',
          relationships: '[]',
          summary: `Database with ${datasource.schemas.length} tables uploaded successfully. AI analysis will be available shortly.`,
        },
      });
      console.log('[Analyze] Step 7 (fallback): Minimal context saved');
    }

    // Update status to ready
    console.log('[Analyze] Step 8: Setting status to "ready"...');
    await db.dataSource.update({
      where: { id },
      data: {
        status: 'ready',
        errorMessage: analysisSucceeded ? null : 'AI context generation timed out — data is still queryable',
      },
    });

    console.log(`[Analyze] === END === datasource=${id} success=${analysisSucceeded} total=${Date.now() - startTime}ms`);

    const result = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });

    return NextResponse.json({ datasource: result });
  } catch (error) {
    const errInfo = serializeError(error);
    console.error(`[Analyze] === FATAL ERROR === datasource=${id}:`, errInfo);

    // Try to update status to error — CRITICAL: don't leave it stuck at 'analyzing'
    try {
      await db.dataSource.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: errInfo.message || 'Analysis failed',
        },
      });
      console.log(`[Analyze] Status updated to 'error' for datasource=${id}`);
    } catch (dbError) {
      console.error(`[Analyze] CRITICAL: Failed to update error status for datasource=${id}:`, serializeError(dbError));
    }

    // Return detailed error info so it shows in the browser console
    return NextResponse.json({
      error: 'Failed to analyze data source',
      detail: errInfo.message,
      stack: process.env.NODE_ENV === 'development' ? errInfo.stack : undefined,
    }, { status: 500 });
  }
}
