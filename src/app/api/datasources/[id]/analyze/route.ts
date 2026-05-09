import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSchemaDescription, generateSampleDataDescription } from '@/lib/sqlite';
import { analyzeSchemaWithContext } from '@/lib/ai';
import { requireAuth } from '@/lib/auth-utils';

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
    // Step 1: Auth
    const t0 = Date.now();
    const user = await requireAuth();
    console.log(`[Analyze] ⏱ Auth: ${Date.now() - t0}ms (user=${user.id})`);

    // Step 2: Fetch datasource
    const t1 = Date.now();
    const datasource = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });
    console.log(`[Analyze] ⏱ Fetch datasource: ${Date.now() - t1}ms (found=${!!datasource})`);

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found', detail: `No datasource with id=${id}` }, { status: 404 });
    }

    // OPTIMIZATION: Direct comparison instead of verifyOwnership()
    if (datasource.userId !== user.id) {
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

    // Step 3: Set status to analyzing
    const t3 = Date.now();
    await db.dataSource.update({
      where: { id },
      data: { status: 'analyzing', errorMessage: null },
    });
    console.log(`[Analyze] ⏱ Set status analyzing: ${Date.now() - t3}ms`);

    // ──────────────────────────────────────────────────────────
    // Use existing schemas from DB (already extracted during upload)
    // ──────────────────────────────────────────────────────────
    if (datasource.schemas.length === 0) {
      console.warn(`[Analyze] No schemas — cannot analyze`);
      await db.dataSource.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: 'No schema information found. Please re-upload the file.',
        },
      });
      return NextResponse.json({
        error: 'No schema information found',
        detail: `Datasource ${id} has 0 schemas. Try re-uploading.`,
      }, { status: 400 });
    }

    // Step 4: Build schema description
    const t4 = Date.now();
    const tables = datasource.schemas.map((s) => ({
      name: s.tableName,
      columns: JSON.parse(s.columns),
      rowCount: s.rowCount,
      sampleData: JSON.parse(s.sampleData),
    }));
    const schemaDescription = generateSchemaDescription(tables);
    const sampleDescription = generateSampleDataDescription(tables);
    console.log(`[Analyze] ⏱ Build schema desc: ${Date.now() - t4}ms (${schemaDescription.length} chars)`);

    // Step 5: Delete old contexts
    const t5 = Date.now();
    await db.sourceContext.deleteMany({ where: { dataSourceId: id } });
    console.log(`[Analyze] ⏱ Delete old contexts: ${Date.now() - t5}ms`);

    // Step 6: Run AI analysis (with 45s timeout)
    let analysisSucceeded = false;
    try {
      console.log('[Analyze] ⏱ Calling AI analyzeSchemaWithContext (timeout: 45s)...');
      const analysis = await withTimeout(
        analyzeSchemaWithContext(schemaDescription, sampleDescription),
        45000,
        'AI analysis'
      );
      console.log(`[Analyze] ⏱ AI analysis completed: ${Date.now() - startTime}ms total`);

      // Step 7: Save AI context
      const t7 = Date.now();
      await db.sourceContext.create({
        data: {
          dataSourceId: id,
          semanticContext: analysis.semanticContext,
          businessGlossary: JSON.stringify(analysis.businessGlossary),
          relationships: JSON.stringify(analysis.relationships),
          summary: analysis.summary,
        },
      });
      console.log(`[Analyze] ⏱ Save AI context: ${Date.now() - t7}ms`);
      analysisSucceeded = true;
    } catch (aiError) {
      const errInfo = serializeError(aiError);
      console.warn(`[Analyze] ⚠ AI analysis failed (non-critical): ${errInfo.message}`);

      // Save fallback context
      try {
        await db.sourceContext.create({
          data: {
            dataSourceId: id,
            semanticContext: 'Schema analysis pending. You can still query your data — the AI context will enhance future queries.',
            businessGlossary: '{}',
            relationships: '[]',
            summary: `Database with ${datasource.schemas.length} tables uploaded successfully. AI analysis will be available shortly.`,
          },
        });
      } catch (fallbackErr) {
        console.error('[Analyze] Fallback context save also failed:', serializeError(fallbackErr).message);
      }
    }

    // Step 8: Update status to ready
    const t8 = Date.now();
    await db.dataSource.update({
      where: { id },
      data: {
        status: 'ready',
        errorMessage: analysisSucceeded ? null : 'AI context generation timed out — data is still queryable',
      },
    });
    console.log(`[Analyze] ⏱ Set status ready: ${Date.now() - t8}ms`);

    // Step 9: Fetch final result
    const t9 = Date.now();
    const result = await db.dataSource.findUnique({
      where: { id },
      include: { schemas: true, contexts: true },
    });
    console.log(`[Analyze] ⏱ Fetch final result: ${Date.now() - t9}ms`);

    console.log(`[Analyze] === END === datasource=${id} success=${analysisSucceeded} total=${Date.now() - startTime}ms`);

    return NextResponse.json({ datasource: result });
  } catch (error) {
    const errInfo = serializeError(error);
    console.error(`[Analyze] === FATAL ERROR === datasource=${id} after ${Date.now() - startTime}ms:`, errInfo);

    // Try to update status to error — CRITICAL: don't leave it stuck at 'analyzing'
    try {
      await db.dataSource.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage: errInfo.message || 'Analysis failed',
        },
      });
    } catch (dbError) {
      console.error(`[Analyze] CRITICAL: Failed to update error status:`, serializeError(dbError));
    }

    return NextResponse.json({
      error: 'Failed to analyze data source',
      detail: errInfo.message,
    }, { status: 500 });
  }
}
