import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateSQLFromNaturalLanguage, regenerateSQLWithFeedback, isRetryableExecutionError, createCompletion, detectLanguage } from '@/lib/ai';
import { executeSelectQuery, generateSchemaDescription } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';
import { requireAuth } from '@/lib/auth-utils';
import { suggestVisualizationHeuristic } from '@/lib/viz-heuristics';

// ============================================================
// Timeout helper — wraps a promise with a timeout
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
// Error serializer for consistent logging
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
// SSE Helpers — send events through a ReadableStream
// ============================================================

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  const startTime = Date.now();

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  function send(event: SSEEvent) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  }

  function close() {
    try { controller.close(); } catch { /* already closed */ }
  }

  /**
   * Start a heartbeat interval that sends `elapsed_ms` updates every 3 seconds.
   * Returns a cleanup function that stops the heartbeat.
   */
  function startHeartbeat(): () => void {
    const interval = setInterval(() => {
      send({ type: 'heartbeat', elapsed_ms: Date.now() - startTime });
    }, 3000);
    return () => clearInterval(interval);
  }

  return { stream, send, close, startHeartbeat, startTime };
}

// ============================================================
// Step logger — logs timing + sends SSE log event
// ============================================================

interface StepLog {
  step: string;
  duration_ms: number;
  detail?: string;
  status: 'start' | 'done' | 'error';
}

function createStepLogger(send: (event: SSEEvent) => void, overallStart: number) {
  const stepStartTimes: Record<string, number> = {};

  function startStep(step: string, detail?: string) {
    stepStartTimes[step] = Date.now();
    const log: StepLog = { step, duration_ms: Date.now() - overallStart, detail, status: 'start' };
    console.log(`[Chat] ⏱ STEP START: ${step} (overall: ${log.duration_ms}ms)${detail ? ` — ${detail}` : ''}`);
    send({ type: 'log', ...log });
    return stepStartTimes[step];
  }

  function endStep(step: string, detail?: string) {
    const stepStart = stepStartTimes[step] || overallStart;
    const stepDuration = Date.now() - stepStart;
    const overallDuration = Date.now() - overallStart;
    const log: StepLog = { step, duration_ms: stepDuration, detail, status: 'done' };
    console.log(`[Chat] ⏱ STEP DONE: ${step} — ${stepDuration}ms (overall: ${overallDuration}ms)${detail ? ` — ${detail}` : ''}`);
    send({ type: 'log', ...log, overall_ms: overallDuration });
    return stepDuration;
  }

  function errorStep(step: string, detail?: string) {
    const stepStart = stepStartTimes[step] || overallStart;
    const stepDuration = Date.now() - stepStart;
    const overallDuration = Date.now() - overallStart;
    const log: StepLog = { step, duration_ms: stepDuration, detail, status: 'error' };
    console.error(`[Chat] ⏱ STEP ERROR: ${step} — ${stepDuration}ms (overall: ${overallDuration}ms)${detail ? ` — ${detail}` : ''}`);
    send({ type: 'log', ...log, overall_ms: overallDuration });
    return stepDuration;
  }

  return { startStep, endStep, errorStep };
}

// ============================================================
// Localized message helpers
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

// POST /api/chat - Process a natural language query (SSE streaming)
export async function POST(request: NextRequest) {
  const { stream, send, close, startHeartbeat, startTime } = createSSEStream();
  const log = createStepLogger(send, startTime);

  console.log(`[Chat] === REQUEST RECEIVED === (handler started at ${startTime})`);

  // Send a connected event IMMEDIATELY so that:
  // 1. Caddy/Next.js flushes the response headers (no gateway timeout)
  // 2. The client knows the server received the request
  // 3. The SSE stream starts flowing right away
  send({ type: 'connected', timestamp: startTime });
  console.log('[Chat] SSE "connected" event enqueued');

  // Run the main processing in the background so we can return the stream immediately
  (async () => {
    // Start heartbeat to keep connection alive and show elapsed time on client
    const stopHeartbeat = startHeartbeat();

    try {
      console.log('[Chat] === START === Background processing begins');

      // ──────────────────────────────────────────────────────────
      // STEP 0: Authentication
      // ──────────────────────────────────────────────────────────
      let user;
      try {
        log.startStep('auth');
        user = await requireAuth();
        log.endStep('auth', `user=${user.id}`);
      } catch (authError) {
        log.errorStep('auth', serializeError(authError).message);
        send({ type: 'error', error: 'Authentication required' });
        close();
        return;
      }

      // ──────────────────────────────────────────────────────────
      // STEP 1: Parse request body
      // ──────────────────────────────────────────────────────────
      log.startStep('parse_body');
      const body = await request.json();
      const { message, dataSourceId, sessionId, queryRowLimit } = body;
      log.endStep('parse_body', `message="${message?.slice(0, 50)}", dataSourceId=${dataSourceId}`);

      if (!message || !dataSourceId) {
        send({ type: 'error', error: 'Message and dataSourceId are required' });
        close();
        return;
      }

      // Detect user language early
      const lang = detectLanguage(message);

      // ──────────────────────────────────────────────────────────
      // STEP 2: Fetch datasource from DB
      // ──────────────────────────────────────────────────────────
      log.startStep('fetch_datasource', `id=${dataSourceId}`);
      const datasource = await db.dataSource.findUnique({
        where: { id: dataSourceId },
        include: {
          schemas: true,
          contexts: true,
        },
      });
      log.endStep('fetch_datasource', `found=${!!datasource}, schemas=${datasource?.schemas.length}, contexts=${datasource?.contexts.length}`);

      if (!datasource) {
        log.errorStep('fetch_datasource', 'NOT FOUND');
        send({ type: 'error', error: 'Data source not found' });
        close();
        return;
      }

      // Verify ownership
      const isDatasourceOwner = datasource.userId === user.id;
      if (!isDatasourceOwner) {
        log.errorStep('fetch_datasource', 'FORBIDDEN — not owner');
        send({ type: 'error', error: 'Forbidden' });
        close();
        return;
      }

      // Allow queries if schemas exist, even if status is 'analyzing'
      if (datasource.status === 'error' && datasource.schemas.length === 0) {
        log.errorStep('fetch_datasource', 'ERROR state with no schemas');
        send({ type: 'error', error: 'Data source has errors and no schema available. Please re-upload the file.' });
        close();
        return;
      }
      if (datasource.schemas.length === 0) {
        log.errorStep('fetch_datasource', 'No schemas at all');
        send({ type: 'error', error: 'Data source has no schema information. Please wait for processing or re-upload.' });
        close();
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

      // ──────────────────────────────────────────────────────────
      // STEP 3: Get/create session + save user message
      // ──────────────────────────────────────────────────────────
      log.startStep('session_setup');
      let chatSessionId = sessionId;
      if (!chatSessionId) {
        const session = await db.chatSession.create({
          data: {
            dataSourceId,
            userId: user.id,
            title: message.slice(0, 50),
          },
        });
        chatSessionId = session.id;
      } else {
        const existingSession = await db.chatSession.findUnique({
          where: { id: chatSessionId },
        });
        if (!existingSession) {
          send({ type: 'error', error: 'Session not found' });
          close();
          return;
        }
        const isSessionOwner = existingSession.userId === user.id;
        if (!isSessionOwner) {
          send({ type: 'error', error: 'Forbidden' });
          close();
          return;
        }
      }

      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'user',
          content: message,
        },
      });
      log.endStep('session_setup', `sessionId=${chatSessionId}`);

      // Send session info
      send({ type: 'session', sessionId: chatSessionId });

      // ──────────────────────────────────────────────────────────
      // STEP 4: Build schema context
      // ──────────────────────────────────────────────────────────
      log.startStep('build_context');
      const tables = datasource.schemas.map((s) => ({
        name: s.tableName,
        columns: JSON.parse(s.columns),
        rowCount: s.rowCount,
        sampleData: JSON.parse(s.sampleData),
      }));
      const schemaDescription = generateSchemaDescription(tables);
      const semanticContext = datasource.contexts[0]?.semanticContext || '';
      log.endStep('build_context', `schemaLen=${schemaDescription.length}, contextLen=${semanticContext.length}`);

      // ──────────────────────────────────────────────────────────
      // STEP 5: Fetch previous query history
      // ──────────────────────────────────────────────────────────
      log.startStep('fetch_history');
      const previousHistory = await db.queryHistory.findMany({
        where: { dataSourceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      const previousQueries = previousHistory.map((q) => ({
        question: q.naturalQuery,
        sql: q.sqlQuery,
      }));
      log.endStep('fetch_history', `previousQueries=${previousQueries.length}`);

      // ──────────────────────────────────────────────────────────
      // STAGE 1: Generate SQL (AI call — this is the slowest part!)
      // ──────────────────────────────────────────────────────────
      send({
        type: 'stage',
        stage: 'generating_sql',
        message: t(lang, 'stageGeneratingSQL'),
      });

      log.startStep('ai_sql_generation', `timeout=30s`);
      let sqlResult;
      try {
        sqlResult = await withTimeout(
          generateSQLFromNaturalLanguage(
            message,
            schemaDescription,
            semanticContext,
            previousQueries,
            queryRowLimit
          ),
          30_000, // Increased from 20s to 30s
          'SQL generation'
        );
        log.endStep('ai_sql_generation', `type=${sqlResult.type}, confidence=${sqlResult.confidence}, sql="${sqlResult.sql?.slice(0, 80)}"`);
      } catch (timeoutError) {
        const errInfo = serializeError(timeoutError);
        log.errorStep('ai_sql_generation', errInfo.message);
        const errorMsg = errInfo.message || 'SQL generation failed';

        const errorContent = `## ${t(lang, 'queryExecutionError')}\n\n${errorMsg}`;
        await db.chatMessage.create({
          data: { sessionId: chatSessionId, role: 'assistant', content: errorContent },
        });

        send({
          type: 'complete',
          sessionId: chatSessionId,
          message: {
            role: 'assistant',
            content: errorContent,
            confidence: 0,
          },
        });
        close();
        return;
      }

      // Handle schema questions — no SQL execution needed
      if (sqlResult.type === 'schema_question') {
        log.startStep('schema_response');
        console.log('[Chat] Schema question — no SQL execution needed');
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
              const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
              return `- \`${c.name}\` (${c.type})${flagStr}`;
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

        log.endStep('schema_response');
        send({
          type: 'complete',
          sessionId: chatSessionId,
          message: {
            role: 'assistant',
            content: schemaResponse,
            confidence: sqlResult.confidence,
          },
        });
        close();
        return;
      }

      if (!sqlResult.sql || sqlResult.confidence === 0) {
        console.log(`[Chat] No SQL generated or confidence=0`);
        const unableContent = `## ${t(lang, 'unableToGenerate')}\n\n${sqlResult.explanation || t(lang, 'unableToGenerateDesc')}`;
        await db.chatMessage.create({
          data: { sessionId: chatSessionId, role: 'assistant', content: unableContent, sqlQuery: sqlResult.sql || null },
        });

        send({
          type: 'complete',
          sessionId: chatSessionId,
          message: {
            role: 'assistant',
            content: unableContent,
            sqlQuery: sqlResult.sql || null,
            confidence: sqlResult.confidence,
          },
        });
        close();
        return;
      }

      // ──────────────────────────────────────────────────────────
      // STEP 6: Validate SQL security
      // ──────────────────────────────────────────────────────────
      log.startStep('validate_sql');
      const validation = validateSQLQuery(sqlResult.sql);
      log.endStep('validate_sql', `isSafe=${validation.isSafe}`);
      if (!validation.isSafe) {
        log.errorStep('validate_sql', `blocked: ${validation.errors.join(', ')}`);
        const blockedContent = `## ${t(lang, 'queryBlocked')}\n\n${t(lang, 'queryBlockedDesc')} ${validation.errors.join(', ')}. ${t(lang, 'pleaseRephrase')}`;
        await db.chatMessage.create({
          data: { sessionId: chatSessionId, role: 'assistant', content: blockedContent, sqlQuery: sqlResult.sql },
        });

        send({
          type: 'complete',
          sessionId: chatSessionId,
          message: {
            role: 'assistant',
            content: blockedContent,
            sqlQuery: sqlResult.sql,
            confidence: 0,
          },
        });
        close();
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

      const responseRowLimit = typeof queryRowLimit === 'number' ? queryRowLimit : 500;
      const MAX_RETRIES = 2;
      let queryResult;
      let finalSQL = sanitizeSQL(sqlResult.sql);
      let lastError = '';
      let retryCount = 0;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const execLabel = attempt === 0 ? 'sql_execute' : `sql_execute_retry_${attempt}`;
        log.startStep(execLabel, `attempt=${attempt + 1}, sql="${finalSQL.slice(0, 80)}"`);
        try {
          queryResult = executeSelectQuery(datasource.filePath, finalSQL);
          lastError = '';
          log.endStep(execLabel, `rows=${queryResult.rowCount}, time=${queryResult.executionTime}ms`);
          break;
        } catch (execError) {
          lastError = execError instanceof Error ? execError.message : 'Query execution failed';
          log.errorStep(execLabel, lastError);

          if (lastError.includes('file not found') || lastError.includes('Database file not found')) {
            console.error('[Chat] Database file not found — aborting retries');
            break;
          }

          if (attempt < MAX_RETRIES && isRetryableExecutionError(lastError)) {
            // Send retry stage
            send({
              type: 'stage',
              stage: 'retrying',
              message: t(lang, 'stageRetrying'),
              attempt: attempt + 1,
            });

            const retryLabel = `ai_sql_retry_${attempt + 1}`;
            log.startStep(retryLabel, 'timeout=30s');
            try {
              const retryResult = await withTimeout(
                regenerateSQLWithFeedback(
                  message, finalSQL, lastError, schemaDescription, semanticContext, queryRowLimit
                ),
                30_000, // Increased from 20s
                'SQL regeneration'
              );

              if (!retryResult.sql || retryResult.confidence === 0) {
                log.errorStep(retryLabel, 'AI returned no SQL or confidence=0');
                break;
              }

              const retryValidation = validateSQLQuery(retryResult.sql);
              if (!retryValidation.isSafe) {
                log.errorStep(retryLabel, 'AI SQL blocked by security');
                break;
              }

              finalSQL = sanitizeSQL(retryResult.sql);
              retryCount++;
              log.endStep(retryLabel, `new SQL: "${finalSQL.slice(0, 80)}"`);

              // Send updated SQL
              send({
                type: 'stage',
                stage: 'executing',
                message: t(lang, 'stageExecuting'),
                sql: finalSQL,
              });
            } catch (retryTimeoutError) {
              log.errorStep(retryLabel, serializeError(retryTimeoutError).message);
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
        log.errorStep('sql_execute_final', `No result. Last error: ${lastError}`);
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
          message: {
            role: 'assistant',
            content: errorContent,
            sqlQuery: finalSQL,
            confidence: sqlResult.confidence,
          },
        });
        close();
        return;
      }

      // ──────────────────────────────────────────────────────────
      // STAGE 3: Heuristic visualization (instant, no AI call!)
      // ──────────────────────────────────────────────────────────
      log.startStep('visualization');
      const slicedData = responseRowLimit > 0
        ? queryResult.data.slice(0, responseRowLimit)
        : queryResult.data;
      const resultColumns = queryResult.columns || (slicedData.length > 0 ? Object.keys(slicedData[0]) : []);

      // Use heuristic visualization instead of AI call — instant!
      const visualization = suggestVisualizationHeuristic(finalSQL, queryResult.data, message);
      log.endStep('visualization', `type=${visualization?.chartType || 'none'}`);

      // Send intermediate results so the UI can show data right away
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

      // ──────────────────────────────────────────────────────────
      // STAGE 4: AI Analysis (this can be slow too)
      // ──────────────────────────────────────────────────────────
      send({
        type: 'stage',
        stage: 'analyzing',
        message: t(lang, 'stageAnalyzing'),
      });

      const sampleResults = queryResult.data.slice(0, 10);
      let analysis = '';
      log.startStep('ai_analysis', 'timeout=30s');
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
          30_000, // Increased from 15s to 30s
          'Result analysis'
        );

        if (analysisCompletion?.content) {
          analysis = analysisCompletion.content;
        }
        log.endStep('ai_analysis', `contentLen=${analysis.length}`);
      } catch (err) {
        log.errorStep('ai_analysis', serializeError(err).message);
      }

      if (!analysis) {
        analysis = `## ${t(lang, 'queryResults')}\n\n${t(lang, 'queryReturned')} **${queryResult.rowCount}** ${t(lang, 'rows')} ${t(lang, 'rowsIn')} **${queryResult.executionTime}ms**.`;
      }

      // ──────────────────────────────────────────────────────────
      // STEP 7: Save results to DB
      // ──────────────────────────────────────────────────────────
      log.startStep('save_results');
      const retryNote = retryCount > 0
        ? ` (${t(lang, 'autoCorrected')} ${retryCount} ${retryCount > 1 ? t(lang, 'attempts') : t(lang, 'attempt')})`
        : '';
      const successMsg = t(lang, 'queryExecutedSuccessfully');
      const rowsWord = t(lang, 'rows');
      const responseContent = `${analysis}\n\n📊 **${successMsg}**${retryNote} (${queryResult.rowCount} ${rowsWord}, ${queryResult.executionTime}ms)`;

      // Save assistant message
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

      // Save to query history
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
      log.endStep('save_results');

      const totalMs = Date.now() - startTime;
      console.log(`[Chat] === END === total=${totalMs}ms, rows=${queryResult.rowCount}, retries=${retryCount}`);

      // Send final complete event with timing summary
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
        timing: {
          total_ms: totalMs,
          steps: {
            auth: '(see log events)',
            sql_generation: '(see log events)',
            sql_execution: '(see log events)',
            analysis: '(see log events)',
          },
        },
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
      stopHeartbeat();
      close();
    }
  })();

  // Return the SSE stream immediately
  console.log('[Chat] Returning SSE stream response (headers flushed)');
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
