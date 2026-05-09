import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateSQLFromNaturalLanguage, regenerateSQLWithFeedback, isRetryableExecutionError, createCompletion, detectLanguage } from '@/lib/ai';
import { executeSelectQuery, generateSchemaDescription } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';
import { requireAuth, verifyOwnership } from '@/lib/auth-utils';
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
// SSE Helpers — send events through a ReadableStream
// ============================================================

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

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

  return { stream, send, close };
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
  const { stream, send, close } = createSSEStream();

  // Run the main processing in the background so we can return the stream immediately
  (async () => {
    try {
      let user;
      try {
        user = await requireAuth();
      } catch {
        send({ type: 'error', error: 'Authentication required' });
        close();
        return;
      }

      const body = await request.json();
      const { message, dataSourceId, sessionId, queryRowLimit } = body;

      if (!message || !dataSourceId) {
        send({ type: 'error', error: 'Message and dataSourceId are required' });
        close();
        return;
      }

      // Detect user language early
      const lang = detectLanguage(message);

      // Get data source with schema and context
      const datasource = await db.dataSource.findUnique({
        where: { id: dataSourceId },
        include: {
          schemas: true,
          contexts: true,
        },
      });

      if (!datasource) {
        send({ type: 'error', error: 'Data source not found' });
        close();
        return;
      }

      // Verify the data source belongs to the authenticated user
      const isDatasourceOwner = await verifyOwnership(datasource.userId);
      if (!isDatasourceOwner) {
        send({ type: 'error', error: 'Forbidden' });
        close();
        return;
      }

      if (datasource.status !== 'ready') {
        send({ type: 'error', error: 'Data source is not ready for queries' });
        close();
        return;
      }

      // Get or create chat session
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
        const isSessionOwner = await verifyOwnership(existingSession.userId);
        if (!isSessionOwner) {
          send({ type: 'error', error: 'Forbidden' });
          close();
          return;
        }
      }

      // Save user message
      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'user',
          content: message,
        },
      });

      // Send session info
      send({ type: 'session', sessionId: chatSessionId });

      // ──────────────────────────────────────────────────────────
      // STAGE 1: Generate SQL
      // ──────────────────────────────────────────────────────────
      send({
        type: 'stage',
        stage: 'generating_sql',
        message: t(lang, 'stageGeneratingSQL'),
      });

      // Build schema context
      const tables = datasource.schemas.map((s) => ({
        name: s.tableName,
        columns: JSON.parse(s.columns),
        rowCount: s.rowCount,
        sampleData: JSON.parse(s.sampleData),
      }));
      const schemaDescription = generateSchemaDescription(tables);
      const semanticContext = datasource.contexts[0]?.semanticContext || '';

      // Get previous queries for context
      const previousHistory = await db.queryHistory.findMany({
        where: { dataSourceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      const previousQueries = previousHistory.map((q) => ({
        question: q.naturalQuery,
        sql: q.sqlQuery,
      }));

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
          30000,
          'SQL generation'
        );
      } catch (timeoutError) {
        console.error('SQL generation timed out or failed:', timeoutError);
        const errorMsg = timeoutError instanceof Error ? timeoutError.message : 'SQL generation failed';

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

      // Validate the generated SQL
      const validation = validateSQLQuery(sqlResult.sql);
      if (!validation.isSafe) {
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
        try {
          queryResult = executeSelectQuery(datasource.filePath, finalSQL);
          lastError = '';
          break;
        } catch (execError) {
          lastError = execError instanceof Error ? execError.message : 'Query execution failed';

          if (lastError.includes('file not found') || lastError.includes('Database file not found')) {
            console.error('[Chat] Database file not found:', lastError);
            break;
          }

          if (attempt < MAX_RETRIES && isRetryableExecutionError(lastError)) {
            console.log(`[Chat] SQL execution failed (attempt ${attempt + 1}): ${lastError}. Retrying with feedback...`);

            // Send retry stage
            send({
              type: 'stage',
              stage: 'retrying',
              message: t(lang, 'stageRetrying'),
              attempt: attempt + 1,
            });

            try {
              const retryResult = await withTimeout(
                regenerateSQLWithFeedback(
                  message, finalSQL, lastError, schemaDescription, semanticContext, queryRowLimit
                ),
                20000,
                'SQL regeneration'
              );

              if (!retryResult.sql || retryResult.confidence === 0) {
                break;
              }

              const retryValidation = validateSQLQuery(retryResult.sql);
              if (!retryValidation.isSafe) {
                break;
              }

              finalSQL = sanitizeSQL(retryResult.sql);
              retryCount++;

              // Send updated SQL
              send({
                type: 'stage',
                stage: 'executing',
                message: t(lang, 'stageExecuting'),
                sql: finalSQL,
              });
            } catch (retryTimeoutError) {
              console.error('[Chat] SQL regeneration timed out:', retryTimeoutError);
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
      const slicedData = responseRowLimit > 0
        ? queryResult.data.slice(0, responseRowLimit)
        : queryResult.data;
      const resultColumns = queryResult.columns || (slicedData.length > 0 ? Object.keys(slicedData[0]) : []);

      // Use heuristic visualization instead of AI call — instant!
      const visualization = suggestVisualizationHeuristic(finalSQL, queryResult.data, message);

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
      // STAGE 4: AI Analysis (streamed)
      // ──────────────────────────────────────────────────────────
      send({
        type: 'stage',
        stage: 'analyzing',
        message: t(lang, 'stageAnalyzing'),
      });

      const sampleResults = queryResult.data.slice(0, 10);

      let analysis = '';
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
          }),
          20000,
          'Result analysis'
        );

        if (analysisCompletion?.content) {
          analysis = analysisCompletion.content;
        }
      } catch (err) {
        console.error('Analysis failed:', err);
      }

      if (!analysis) {
        analysis = `## ${t(lang, 'queryResults')}\n\n${t(lang, 'queryReturned')} **${queryResult.rowCount}** ${t(lang, 'rows')} ${t(lang, 'rowsIn')} **${queryResult.executionTime}ms**.`;
      }

      // Build the full response content
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
      });
    } catch (error) {
      console.error('Error in chat:', error);
      send({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to process query',
      });
    } finally {
      close();
    }
  })();

  // Return the SSE stream immediately
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
