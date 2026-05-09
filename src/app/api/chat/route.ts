import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateSQLFromNaturalLanguage, regenerateSQLWithFeedback, isRetryableExecutionError, createCompletion, detectLanguage } from '@/lib/ai';
import { executeSelectQuery, generateSchemaDescription } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';
import { requireAuth } from '@/lib/auth-utils';
import { suggestVisualizationHeuristic } from '@/lib/viz-heuristics';

// ============================================================
// Timeout helper
// ============================================================

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ============================================================
// Error serializer
// ============================================================

function serializeError(error: unknown): { message: string; stack?: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack, name: error.name };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { message: String(error) };
}

// ============================================================
// SSE encoder
// ============================================================

const encoder = new TextEncoder();

function sseData(event: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** SSE comment — forces proxy/server to flush buffered data */
function sseComment(): Uint8Array {
  return encoder.encode(': ping\n\n');
}

// ============================================================
// Step logger
// ============================================================

interface StepLog {
  step: string;
  duration_ms: number;
  detail?: string;
  status: 'start' | 'done' | 'error';
  overall_ms?: number;
}

function createStepLogger(overallStart: number) {
  const stepStartTimes: Record<string, number> = {};

  function startStep(step: string, detail?: string): StepLog {
    stepStartTimes[step] = Date.now();
    const log: StepLog = { step, duration_ms: Date.now() - overallStart, detail, status: 'start' };
    console.log(`[Chat] ⏱ START: ${step} (overall: ${log.duration_ms}ms)${detail ? ` — ${detail}` : ''}`);
    return log;
  }

  function endStep(step: string, detail?: string): StepLog {
    const stepStart = stepStartTimes[step] || overallStart;
    const stepDuration = Date.now() - stepStart;
    const overallDuration = Date.now() - overallStart;
    const log: StepLog = { step, duration_ms: stepDuration, detail, status: 'done', overall_ms: overallDuration };
    console.log(`[Chat] ⏱ DONE: ${step} — ${stepDuration}ms (overall: ${overallDuration}ms)${detail ? ` — ${detail}` : ''}`);
    return log;
  }

  function errorStep(step: string, detail?: string): StepLog {
    const stepStart = stepStartTimes[step] || overallStart;
    const stepDuration = Date.now() - stepStart;
    const overallDuration = Date.now() - overallStart;
    const log: StepLog = { step, duration_ms: stepDuration, detail, status: 'error', overall_ms: overallDuration };
    console.error(`[Chat] ⏱ ERROR: ${step} — ${stepDuration}ms (overall: ${overallDuration}ms)${detail ? ` — ${detail}` : ''}`);
    return log;
  }

  return { startStep, endStep, errorStep };
}

// ============================================================
// i18n
// ============================================================

const i18n: Record<string, Record<string, string>> = {
  es: {
    schemaOverview: 'Esquema de la Base de Datos',
    thisDatabaseContains: 'Esta base de datos contiene',
    tables: 'tabla(s)',
    rows: 'filas',
    relationships: 'Relaciones',
    businessGlossary: 'Glosario de Negocio',
    unableToGenerate: 'No se pudo generar la consulta',
    unableToGenerateDesc: 'No pude generar una consulta SQL para tu pregunta. Intenta reformularla.',
    queryBlocked: 'Consulta bloqueada',
    queryBlockedDesc: 'La consulta fue bloqueada por razones de seguridad:',
    pleaseRephrase: 'Por favor, reformula tu pregunta.',
    queryExecutionError: 'Error de ejecución de consulta',
    retried: 'reintentado',
    time: 'vez',
    times: 'veces',
    withAIFeedback: 'con retroalimentación de IA',
    queryExecutedSuccessfully: 'Consulta ejecutada exitosamente',
    autoCorrected: 'auto-corregido después de',
    attempt: 'intento',
    attempts: 'intentos',
    queryResults: 'Resultados de la consulta',
    queryReturned: 'La consulta devolvió',
    rowsIn: 'filas en',
    fileNotFound: 'Archivo de base de datos no encontrado',
    fileNotFoundDesc: 'El archivo de base de datos asociado a esta fuente de datos no se encuentra disponible. Esto puede ocurrir después de un redeployment. Por favor, sube el archivo nuevamente.',
    stageGeneratingSQL: 'Generando consulta SQL...',
    stageExecuting: 'Ejecutando consulta...',
    stageRetrying: 'Corrigiendo consulta con IA...',
    stageAnalyzing: 'Analizando resultados...',
  },
  en: {
    schemaOverview: 'Database Schema Overview',
    thisDatabaseContains: 'This database contains',
    tables: 'table(s)',
    rows: 'rows',
    relationships: 'Relationships',
    businessGlossary: 'Business Glossary',
    unableToGenerate: 'Unable to Generate Query',
    unableToGenerateDesc: 'I could not generate a SQL query for your question. Please try rephrasing.',
    queryBlocked: 'Query Blocked',
    queryBlockedDesc: 'The generated query was blocked for security reasons:',
    pleaseRephrase: 'Please rephrase your question.',
    queryExecutionError: 'Query Execution Error',
    retried: 'retried',
    time: 'time',
    times: 'times',
    withAIFeedback: 'with AI feedback',
    queryExecutedSuccessfully: 'Query executed successfully',
    autoCorrected: 'auto-corrected after',
    attempt: 'attempt',
    attempts: 'attempts',
    queryResults: 'Query Results',
    queryReturned: 'Query returned',
    rowsIn: 'rows in',
    fileNotFound: 'Database file not found',
    fileNotFoundDesc: 'The database file for this data source is no longer available. This can happen after a redeployment. Please re-upload the file.',
    stageGeneratingSQL: 'Generating SQL query...',
    stageExecuting: 'Executing query...',
    stageRetrying: 'Correcting query with AI...',
    stageAnalyzing: 'Analyzing results...',
  },
  pt: {
    schemaOverview: 'Esquema do Banco de Dados',
    thisDatabaseContains: 'Este banco de dados contém',
    tables: 'tabela(s)',
    rows: 'linhas',
    relationships: 'Relacionamentos',
    businessGlossary: 'Glossário de Negócios',
    unableToGenerate: 'Não foi possível gerar a consulta',
    unableToGenerateDesc: 'Não consegui gerar uma consulta SQL para sua pergunta. Tente reformular.',
    queryBlocked: 'Consulta bloqueada',
    queryBlockedDesc: 'A consulta foi bloqueada por motivos de segurança:',
    pleaseRephrase: 'Por favor, reformule sua pergunta.',
    queryExecutionError: 'Erro de execução da consulta',
    retried: 'tentado novamente',
    time: 'vez',
    times: 'vezes',
    withAIFeedback: 'com feedback da IA',
    queryExecutedSuccessfully: 'Consulta executada com sucesso',
    autoCorrected: 'auto-corrigido após',
    attempt: 'tentativa',
    attempts: 'tentativas',
    queryResults: 'Resultados da consulta',
    queryReturned: 'A consulta retornou',
    rowsIn: 'linhas em',
    fileNotFound: 'Arquivo de banco de dados não encontrado',
    fileNotFoundDesc: 'O arquivo de banco de dados não está mais disponível. Isso pode acontecer após um novo deploy. Por favor, faça o upload novamente.',
    stageGeneratingSQL: 'Gerando consulta SQL...',
    stageExecuting: 'Executando consulta...',
    stageRetrying: 'Corrigindo consulta com IA...',
    stageAnalyzing: 'Analisando resultados...',
  },
  fr: {
    schemaOverview: 'Schéma de la Base de Données',
    thisDatabaseContains: 'Cette base de données contient',
    tables: 'table(s)',
    rows: 'lignes',
    relationships: 'Relations',
    businessGlossary: 'Glossaire Métier',
    unableToGenerate: 'Impossible de générer la requête',
    unableToGenerateDesc: 'Je n\'ai pas pu générer une requête SQL pour votre question. Veuillez la reformuler.',
    queryBlocked: 'Requête bloquée',
    queryBlockedDesc: 'La requête a été bloquée pour des raisons de sécurité :',
    pleaseRephrase: 'Veuillez reformuler votre question.',
    queryExecutionError: 'Erreur d\'exécution de la requête',
    retried: 'relancée',
    time: 'fois',
    times: 'fois',
    withAIFeedback: 'avec retour de l\'IA',
    queryExecutedSuccessfully: 'Requête exécutée avec succès',
    autoCorrected: 'auto-corrigé après',
    attempt: 'tentative',
    attempts: 'tentatives',
    queryResults: 'Résultats de la requête',
    queryReturned: 'La requête a renvoyé',
    rowsIn: 'lignes en',
    fileNotFound: 'Fichier de base de données introuvable',
    fileNotFoundDesc: 'Le fichier de base de données n\'est plus disponible. Cela peut arriver après un redéploiement. Veuillez le télécharger à nouveau.',
    stageGeneratingSQL: 'Génération de la requête SQL...',
    stageExecuting: 'Exécution de la requête...',
    stageRetrying: 'Correction de la requête par IA...',
    stageAnalyzing: 'Analyse des résultats...',
  },
};

function t(lang: string, key: string): string {
  return i18n[lang]?.[key] || i18n.en[key] || key;
}

// ============================================================
// POST /api/chat — SSE streaming via ReadableStream + controller
// ============================================================
// ARCHITECTURE: Uses ReadableStream({ start(controller) }) with
// controller.enqueue() for SYNCHRONOUS data pushing.
//
// Why this works when TransformStream didn't:
// - controller.enqueue() is synchronous — data is IMMEDIATELY
//   available in the readable stream's buffer
// - The start() callback runs BEFORE the stream is returned
// - The "connected" event is enqueued in start(), guaranteeing
//   the client receives it in <1s
// - Background work runs via setTimeout (macrotask), which
//   fires AFTER the Response is returned to Next.js
// - Heartbeats use setInterval (macrotask), independent of
//   background processing
//
// The previous TransformStream approach failed because
// writer.write() is async and Bun/Next.js appeared to buffer
// the entire response before sending, causing a 12+ second delay.
// ============================================================

export async function POST(request: NextRequest) {
  const overallStart = Date.now();
  const log = createStepLogger(overallStart);

  console.log(`[Chat] === REQUEST RECEIVED === (handler started at ${overallStart})`);

  // Controller reference — shared between start() and background work
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let isClosed = false;

  // Helper: safely enqueue data to the stream
  function send(event: Record<string, unknown>): void {
    if (isClosed || !controller) {
      console.warn('[Chat] Attempted to send after stream closed');
      return;
    }
    try {
      controller.enqueue(sseData(event));
    } catch (err) {
      console.error('[Chat] Failed to enqueue SSE event:', serializeError(err).message);
      isClosed = true;
    }
  }

  // Helper: send SSE comment to force flush
  function sendFlush(): void {
    if (isClosed || !controller) return;
    try {
      controller.enqueue(sseComment());
    } catch {
      isClosed = true;
    }
  }

  // Create the ReadableStream with start() — this guarantees the
  // "connected" event is available BEFORE the Response is returned
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      // CRITICAL: Send initial events SYNCHRONOUSLY in start()
      // This ensures they're in the stream buffer before the
      // Response is returned to Next.js
      ctrl.enqueue(sseComment()); // Force flush
      ctrl.enqueue(sseData({ type: 'connected', timestamp: overallStart }));
      console.log('[Chat] SSE "connected" event enqueued in start()');
    },
    cancel() {
      console.log('[Chat] Stream cancelled by client');
      isClosed = true;
    },
  });

  // Start heartbeat — sends SSE comment + heartbeat every 3s
  // This is independent of the background processing
  const heartbeatInterval = setInterval(() => {
    if (isClosed) return;
    sendFlush();
    send({ type: 'heartbeat', elapsed_ms: Date.now() - overallStart });
  }, 3000);

  // Schedule background processing as a MACROTASK via setTimeout(0)
  // This ensures the Response is returned to Next.js BEFORE
  // any heavy processing begins
  setTimeout(() => {
    console.log('[Chat] Background processing started (setTimeout fired)');

    (async () => {
      try {
        // STEP 1: Authentication
        let user;
        try {
          log.startStep('auth');
          user = await requireAuth();
          const logEntry = log.endStep('auth', `user=${user.id}`);
          send({ type: 'log', ...logEntry });
          sendFlush();
        } catch (authError) {
          const logEntry = log.errorStep('auth', serializeError(authError).message);
          send({ type: 'log', ...logEntry });
          send({ type: 'error', error: 'Authentication required' });
          return;
        }

        // STEP 2: Parse request body
        const parseLog = log.startStep('parse_body');
        send({ type: 'log', ...parseLog });

        const body = await request.json();
        const { message, dataSourceId, sessionId, queryRowLimit } = body;

        const parseDone = log.endStep('parse_body', `message="${message?.slice(0, 50)}", dataSourceId=${dataSourceId}`);
        send({ type: 'log', ...parseDone });

        if (!message || !dataSourceId) {
          send({ type: 'error', error: 'Message and dataSourceId are required' });
          return;
        }

        const lang = detectLanguage(message);

        // STEP 3: Fetch datasource from DB
        const fetchLog = log.startStep('fetch_datasource', `id=${dataSourceId}`);
        send({ type: 'log', ...fetchLog });

        const datasource = await db.dataSource.findUnique({
          where: { id: dataSourceId },
          include: { schemas: true, contexts: true },
        });

        const fetchDone = log.endStep('fetch_datasource', `found=${!!datasource}, schemas=${datasource?.schemas.length}`);
        send({ type: 'log', ...fetchDone });
        sendFlush();

        if (!datasource) {
          const logEntry = log.errorStep('fetch_datasource', 'NOT FOUND');
          send({ type: 'log', ...logEntry });
          send({ type: 'error', error: 'Data source not found' });
          return;
        }

        // Verify ownership
        const isDatasourceOwner = datasource.userId === user.id;
        if (!isDatasourceOwner) {
          const logEntry = log.errorStep('fetch_datasource', 'FORBIDDEN');
          send({ type: 'log', ...logEntry });
          send({ type: 'error', error: 'Forbidden' });
          return;
        }

        if (datasource.status === 'error' && datasource.schemas.length === 0) {
          send({ type: 'error', error: 'Data source has errors and no schema available. Please re-upload the file.' });
          return;
        }
        if (datasource.schemas.length === 0) {
          send({ type: 'error', error: 'Data source has no schema information. Please wait for processing or re-upload.' });
          return;
        }

        // Auto-fix stuck 'analyzing' status
        if (datasource.status === 'analyzing' && datasource.schemas.length > 0) {
          console.log(`[Chat] Auto-fixing stuck 'analyzing' status for datasource ${dataSourceId}`);
          try {
            await db.dataSource.update({
              where: { id: dataSourceId },
              data: { status: 'ready', errorMessage: null },
            });
          } catch (fixError) {
            console.warn('[Chat] Auto-fix DB update failed:', serializeError(fixError));
          }
        }

        // STEP 4: Session setup + save user message
        const sessLog = log.startStep('session_setup');
        send({ type: 'log', ...sessLog });

        let chatSessionId = sessionId;
        if (!chatSessionId) {
          const session = await db.chatSession.create({
            data: { dataSourceId, userId: user.id, title: message.slice(0, 50) },
          });
          chatSessionId = session.id;
        } else {
          const existingSession = await db.chatSession.findUnique({ where: { id: chatSessionId } });
          if (!existingSession) {
            send({ type: 'error', error: 'Session not found' });
            return;
          }
          if (existingSession.userId !== user.id) {
            send({ type: 'error', error: 'Forbidden' });
            return;
          }
        }

        await db.chatMessage.create({
          data: { sessionId: chatSessionId, role: 'user', content: message },
        });

        const sessDone = log.endStep('session_setup', `sessionId=${chatSessionId}`);
        send({ type: 'log', ...sessDone });
        send({ type: 'session', sessionId: chatSessionId });
        sendFlush();

        // STEP 5: Build schema context
        const ctxLog = log.startStep('build_context');
        send({ type: 'log', ...ctxLog });

        const tables = datasource.schemas.map((s) => ({
          name: s.tableName,
          columns: JSON.parse(s.columns),
          rowCount: s.rowCount,
          sampleData: JSON.parse(s.sampleData),
        }));
        const schemaDescription = generateSchemaDescription(tables);
        const semanticContext = datasource.contexts[0]?.semanticContext || '';

        const ctxDone = log.endStep('build_context', `schemaLen=${schemaDescription.length}`);
        send({ type: 'log', ...ctxDone });

        // STEP 6: Fetch previous query history
        const histLog = log.startStep('fetch_history');
        send({ type: 'log', ...histLog });

        const previousHistory = await db.queryHistory.findMany({
          where: { dataSourceId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
        const previousQueries = previousHistory.map((q) => ({
          question: q.naturalQuery,
          sql: q.sqlQuery,
        }));

        const histDone = log.endStep('fetch_history', `count=${previousQueries.length}`);
        send({ type: 'log', ...histDone });
        sendFlush();

        // ──────────────────────────────────────────────────────────
        // STAGE 1: Generate SQL (AI call)
        // ──────────────────────────────────────────────────────────
        send({
          type: 'stage',
          stage: 'generating_sql',
          message: t(lang, 'stageGeneratingSQL'),
        });

        const sqlLogStart = log.startStep('ai_sql_generation', 'timeout=60s');
        send({ type: 'log', ...sqlLogStart });
        sendFlush();

        let sqlResult;
        try {
          sqlResult = await withTimeout(
            generateSQLFromNaturalLanguage(
              message, schemaDescription, semanticContext, previousQueries, queryRowLimit
            ),
            60_000,
            'SQL generation'
          );
          const sqlLogDone = log.endStep('ai_sql_generation', `type=${sqlResult.type}, confidence=${sqlResult.confidence}`);
          send({ type: 'log', ...sqlLogDone });
          sendFlush();
        } catch (timeoutError) {
          const errInfo = serializeError(timeoutError);
          const sqlLogErr = log.errorStep('ai_sql_generation', errInfo.message);
          send({ type: 'log', ...sqlLogErr });

          const errorMsg = errInfo.message || 'SQL generation failed';
          const errorContent = `## ${t(lang, 'queryExecutionError')}\n\n${errorMsg}`;
          await db.chatMessage.create({
            data: { sessionId: chatSessionId, role: 'assistant', content: errorContent },
          });

          send({
            type: 'complete',
            sessionId: chatSessionId,
            message: { role: 'assistant', content: errorContent, confidence: 0 },
          });
          return;
        }

        // Handle schema questions
        if (sqlResult.type === 'schema_question') {
          const schemaLogStart = log.startStep('schema_response');
          send({ type: 'log', ...schemaLogStart });

          const context = datasource.contexts[0];
          const tableDetails = datasource.schemas.map((s) => {
            const cols = JSON.parse(s.columns) as Array<{
              name: string; type: string; notNull: boolean; primaryKey: boolean; defaultValue?: string | null;
            }>;
            const columnList = cols
              .map((c) => {
                const flags: string[] = [];
                if (c.primaryKey) flags.push('PK');
                if (c.notNull) flags.push('NOT NULL');
                return `- \`${c.name}\` (${c.type})${flags.length > 0 ? ` [${flags.join(', ')}]` : ''}`;
              })
              .join('\n');
            return `### ${s.tableName}\n**${s.rowCount.toLocaleString()}** ${t(lang, 'rows')}\n\n${columnList}`;
          });

          let relationshipsSection = '';
          if (context?.relationships) {
            try {
              const relationships = JSON.parse(context.relationships) as Array<{
                from: string; to: string; type: string; description: string;
              }>;
              if (relationships.length > 0) {
                relationshipsSection = `\n\n### ${t(lang, 'relationships')}\n` + relationships
                  .map((r) => `- \`${r.from}\` → \`${r.to}\` (${r.type}) — ${r.description}`)
                  .join('\n');
              }
            } catch { /* ignore */ }
          }

          let glossarySection = '';
          if (context?.businessGlossary) {
            try {
              const glossary = JSON.parse(context.businessGlossary) as Record<string, string>;
              const entries = Object.entries(glossary);
              if (entries.length > 0) {
                glossarySection = `\n\n### ${t(lang, 'businessGlossary')}\n` + entries
                  .map(([term, def]) => `- **${term}**: ${def}`)
                  .join('\n');
              }
            } catch { /* ignore */ }
          }

          const summarySection = context?.summary ? `\n\n> ${context.summary}` : '';
          const schemaResponse = `## ${t(lang, 'schemaOverview')}\n\n${t(lang, 'thisDatabaseContains')} **${datasource.schemas.length}** ${t(lang, 'tables')}.${summarySection}\n\n${tableDetails.join('\n\n')}${relationshipsSection}${glossarySection}`;

          await db.chatMessage.create({
            data: { sessionId: chatSessionId, role: 'assistant', content: schemaResponse },
          });

          const schemaLogDone = log.endStep('schema_response');
          send({ type: 'log', ...schemaLogDone });

          send({
            type: 'complete',
            sessionId: chatSessionId,
            message: { role: 'assistant', content: schemaResponse, confidence: sqlResult.confidence },
          });
          return;
        }

        if (!sqlResult.sql || sqlResult.confidence === 0) {
          const unableContent = `## ${t(lang, 'unableToGenerate')}\n\n${sqlResult.explanation || t(lang, 'unableToGenerateDesc')}`;
          await db.chatMessage.create({
            data: { sessionId: chatSessionId, role: 'assistant', content: unableContent, sqlQuery: sqlResult.sql || null },
          });

          send({
            type: 'complete',
            sessionId: chatSessionId,
            message: { role: 'assistant', content: unableContent, sqlQuery: sqlResult.sql || null, confidence: sqlResult.confidence },
          });
          return;
        }

        // STEP 7: Validate SQL security
        const valLog = log.startStep('validate_sql');
        send({ type: 'log', ...valLog });

        const validation = validateSQLQuery(sqlResult.sql);

        const valDone = log.endStep('validate_sql', `isSafe=${validation.isSafe}`);
        send({ type: 'log', ...valDone });

        if (!validation.isSafe) {
          const valErr = log.errorStep('validate_sql', `blocked: ${validation.errors.join(', ')}`);
          send({ type: 'log', ...valErr });

          const blockedContent = `## ${t(lang, 'queryBlocked')}\n\n${t(lang, 'queryBlockedDesc')} ${validation.errors.join(', ')}. ${t(lang, 'pleaseRephrase')}`;
          await db.chatMessage.create({
            data: { sessionId: chatSessionId, role: 'assistant', content: blockedContent, sqlQuery: sqlResult.sql },
          });

          send({
            type: 'complete',
            sessionId: chatSessionId,
            message: { role: 'assistant', content: blockedContent, sqlQuery: sqlResult.sql, confidence: 0 },
          });
          return;
        }

        // ──────────────────────────────────────────────────────────
        // STAGE 2: Execute SQL (with retry loop)
        // ──────────────────────────────────────────────────────────
        send({
          type: 'stage',
          stage: 'executing',
          message: t(lang, 'stageExecuting'),
          sql: sanitizeSQL(sqlResult.sql),
        });
        sendFlush();

        const responseRowLimit = typeof queryRowLimit === 'number' ? queryRowLimit : 500;
        const MAX_RETRIES = 2;
        let queryResult;
        let finalSQL = sanitizeSQL(sqlResult.sql);
        let lastError = '';
        let retryCount = 0;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          const execLabel = attempt === 0 ? 'sql_execute' : `sql_execute_retry_${attempt}`;
          const execLogStart = log.startStep(execLabel, `attempt=${attempt + 1}`);
          send({ type: 'log', ...execLogStart });

          try {
            queryResult = executeSelectQuery(datasource.filePath, finalSQL);
            lastError = '';
            const execLogDone = log.endStep(execLabel, `rows=${queryResult.rowCount}, time=${queryResult.executionTime}ms`);
            send({ type: 'log', ...execLogDone });
            break;
          } catch (execError) {
            lastError = execError instanceof Error ? execError.message : 'Query execution failed';
            const execLogErr = log.errorStep(execLabel, lastError);
            send({ type: 'log', ...execLogErr });

            if (lastError.includes('file not found') || lastError.includes('Database file not found')) {
              console.error('[Chat] Database file not found — aborting retries');
              break;
            }

            if (attempt < MAX_RETRIES && isRetryableExecutionError(lastError)) {
              send({
                type: 'stage',
                stage: 'retrying',
                message: t(lang, 'stageRetrying'),
                attempt: attempt + 1,
              });
              sendFlush();

              const retryLabel = `ai_sql_retry_${attempt + 1}`;
              const retryLogStart = log.startStep(retryLabel, 'timeout=60s');
              send({ type: 'log', ...retryLogStart });

              try {
                const retryResult = await withTimeout(
                  regenerateSQLWithFeedback(
                    message, finalSQL, lastError, schemaDescription, semanticContext, queryRowLimit
                  ),
                  60_000,
                  'SQL regeneration'
                );

                if (!retryResult.sql || retryResult.confidence === 0) {
                  const retryLogErr = log.errorStep(retryLabel, 'AI returned no SQL');
                  send({ type: 'log', ...retryLogErr });
                  break;
                }

                const retryValidation = validateSQLQuery(retryResult.sql);
                if (!retryValidation.isSafe) {
                  const retryLogErr = log.errorStep(retryLabel, 'AI SQL blocked by security');
                  send({ type: 'log', ...retryLogErr });
                  break;
                }

                finalSQL = sanitizeSQL(retryResult.sql);
                retryCount++;
                const retryLogDone = log.endStep(retryLabel, `new SQL: "${finalSQL.slice(0, 80)}"`);
                send({ type: 'log', ...retryLogDone });

                send({
                  type: 'stage',
                  stage: 'executing',
                  message: t(lang, 'stageExecuting'),
                  sql: finalSQL,
                });
                sendFlush();
              } catch (retryTimeoutError) {
                const retryLogErr = log.errorStep(retryLabel, serializeError(retryTimeoutError).message);
                send({ type: 'log', ...retryLogErr });
                break;
              }
            } else {
              break;
            }
          }
        }

        // If query still failed after retries
        if (!queryResult) {
          const isFileNotFoundError = lastError.includes('file not found') || lastError.includes('Database file not found');
          const finalErr = log.errorStep('sql_execute_final', `No result: ${lastError}`);
          send({ type: 'log', ...finalErr });

          const errorContent = isFileNotFoundError
            ? `## ${t(lang, 'fileNotFound')}\n\n${t(lang, 'fileNotFoundDesc')}`
            : `## ${t(lang, 'queryExecutionError')}${retryCount > 0 ? ` (${t(lang, 'retried')} ${retryCount} ${retryCount > 1 ? t(lang, 'times') : t(lang, 'time')} ${t(lang, 'withAIFeedback')})` : ''}\n\n${lastError}`;

          await db.chatMessage.create({
            data: { sessionId: chatSessionId, role: 'assistant', content: errorContent, sqlQuery: finalSQL },
          });

          await db.queryHistory.create({
            data: {
              dataSourceId, sessionId: chatSessionId, naturalQuery: message,
              sqlQuery: finalSQL, resultData: '[]', rowCount: 0, executionTime: 0,
              status: 'error', errorMessage: lastError,
            },
          });

          send({
            type: 'complete',
            sessionId: chatSessionId,
            message: { role: 'assistant', content: errorContent, sqlQuery: finalSQL, confidence: sqlResult.confidence },
          });
          return;
        }

        // ──────────────────────────────────────────────────────────
        // STAGE 3: Heuristic visualization (instant!)
        // ──────────────────────────────────────────────────────────
        const vizLogStart = log.startStep('visualization');
        send({ type: 'log', ...vizLogStart });

        const slicedData = responseRowLimit > 0
          ? queryResult.data.slice(0, responseRowLimit)
          : queryResult.data;
        const resultColumns = queryResult.columns || (slicedData.length > 0 ? Object.keys(slicedData[0]) : []);
        const visualization = suggestVisualizationHeuristic(finalSQL, queryResult.data, message);

        const vizLogDone = log.endStep('visualization', `type=${visualization?.chartType || 'none'}`);
        send({ type: 'log', ...vizLogDone });

        // Send intermediate results — UI shows data right away
        send({
          type: 'query_result',
          sql: finalSQL,
          queryResult: {
            data: slicedData,
            columns: resultColumns,
            rowCount: queryResult.rowCount,
            totalRowCount: queryResult.rowCount,
            executionTime: queryResult.executionTime,
          },
          visualization,
          confidence: sqlResult.confidence,
        });
        sendFlush();

        // ──────────────────────────────────────────────────────────
        // STAGE 4: AI Analysis
        // ──────────────────────────────────────────────────────────
        send({
          type: 'stage',
          stage: 'analyzing',
          message: t(lang, 'stageAnalyzing'),
        });
        sendFlush();

        const sampleResults = queryResult.data.slice(0, 10);
        let analysis = '';

        const anaLogStart = log.startStep('ai_analysis', 'timeout=60s');
        send({ type: 'log', ...anaLogStart });

        try {
          const analysisCompletion = await withTimeout(
            createCompletion({
              systemPrompt: `You are a senior business intelligence analyst. Analyze SQL query results concisely.

CRITICAL RULES:
- ONLY reference column names listed in "Result Columns". Do NOT invent column names.
- Do NOT generate SQL — only analyze results and provide insights.

OUTPUT FORMAT:
## [Title]
1-2 sentence summary.

### Key Findings
- **[Metric]**: [Value with context]
- **[Metric]**: [Value with context]

### [Optional: Trends/Anomalies]
Brief analysis paragraph.

### Recommended Follow-up
- [Actionable question]
- [Actionable question]

STYLE: Professional, concise, bold for key metrics. Scannable in 30 seconds.

LANGUAGE: Respond in the SAME LANGUAGE as the user's question. SQL keywords and column names stay in original form.`,
              userMessage: `Analyze these SQL query results:

Query: ${finalSQL}
Question: ${message}
Result Columns: ${resultColumns.join(', ')}
Total rows: ${queryResult.rowCount}
Execution time: ${queryResult.executionTime}ms${retryCount > 0 ? `\nNote: Auto-corrected after ${retryCount} attempt(s).` : ''}

Sample results:
${JSON.stringify(sampleResults, null, 2)}`,
              temperature: 0.3,
              maxTokens: 1500,
            }),
            60_000,
            'Result analysis'
          );

          if (analysisCompletion?.content) {
            analysis = analysisCompletion.content;
          }
          const anaLogDone = log.endStep('ai_analysis', `contentLen=${analysis.length}`);
          send({ type: 'log', ...anaLogDone });
        } catch (err) {
          const anaLogErr = log.errorStep('ai_analysis', serializeError(err).message);
          send({ type: 'log', ...anaLogErr });
        }

        if (!analysis) {
          analysis = `## ${t(lang, 'queryResults')}\n\n${t(lang, 'queryReturned')} **${queryResult.rowCount}** ${t(lang, 'rows')} ${t(lang, 'rowsIn')} **${queryResult.executionTime}ms**.`;
        }

        // STEP 8: Save results to DB
        const saveLogStart = log.startStep('save_results');
        send({ type: 'log', ...saveLogStart });

        const retryNote = retryCount > 0
          ? ` (${t(lang, 'autoCorrected')} ${retryCount} ${retryCount > 1 ? t(lang, 'attempts') : t(lang, 'attempt')})`
          : '';
        const successMsg = t(lang, 'queryExecutedSuccessfully');
        const rowsWord = t(lang, 'rows');
        const responseContent = `${analysis}\n\n📊 **${successMsg}**${retryNote} (${queryResult.rowCount} ${rowsWord}, ${queryResult.executionTime}ms)`;

        await db.chatMessage.create({
          data: {
            sessionId: chatSessionId,
            role: 'assistant',
            content: responseContent,
            sqlQuery: finalSQL,
            queryResult: JSON.stringify({
              data: slicedData,
              columns: resultColumns,
              rowCount: queryResult.rowCount,
              totalRowCount: queryResult.rowCount,
              executionTime: queryResult.executionTime,
            }),
            visualization: visualization ? JSON.stringify(visualization) : null,
          },
        });

        await db.queryHistory.create({
          data: {
            dataSourceId,
            sessionId: chatSessionId,
            naturalQuery: message,
            sqlQuery: finalSQL,
            resultData: JSON.stringify(slicedData),
            rowCount: queryResult.rowCount,
            executionTime: queryResult.executionTime,
            status: 'success',
          },
        });

        const saveLogDone = log.endStep('save_results');
        send({ type: 'log', ...saveLogDone });

        const totalMs = Date.now() - overallStart;
        console.log(`[Chat] === END === total=${totalMs}ms, rows=${queryResult.rowCount}, retries=${retryCount}`);

        // Send final complete event
        send({
          type: 'complete',
          sessionId: chatSessionId,
          message: {
            role: 'assistant',
            content: responseContent,
            sqlQuery: finalSQL,
            explanation: sqlResult.explanation,
            confidence: sqlResult.confidence,
            queryResult: {
              data: slicedData,
              columns: resultColumns,
              rowCount: queryResult.rowCount,
              totalRowCount: queryResult.rowCount,
              executionTime: queryResult.executionTime,
            },
            visualization,
          },
          timing: { total_ms: totalMs },
        });
      } catch (error) {
        const errInfo = serializeError(error);
        console.error('[Chat] === FATAL ERROR ===:', errInfo);
        send({
          type: 'error',
          error: errInfo.message || 'Failed to process query',
          detail: errInfo.stack || undefined,
        });
      } finally {
        // Stop heartbeat
        clearInterval(heartbeatInterval);
        // Close the stream
        isClosed = true;
        try {
          controller?.close();
          console.log('[Chat] Stream closed');
        } catch (closeErr) {
          console.error('[Chat] Failed to close stream:', serializeError(closeErr).message);
        }
      }
    })();
  }, 0);

  // Return Response IMMEDIATELY — the stream already has the "connected"
  // event in its buffer from start(), so the client gets data in <1s
  console.log('[Chat] Returning SSE stream response (ReadableStream + controller)');

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
