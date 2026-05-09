import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSQLFromNaturalLanguage, regenerateSQLWithFeedback, isRetryableExecutionError, suggestVisualization, createCompletion, detectLanguage } from '@/lib/ai';
import { executeSelectQuery, generateSchemaDescription } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';
import { requireAuth, verifyOwnership } from '@/lib/auth-utils';

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
  },
};

function t(lang: string, key: string): string {
  return i18n[lang]?.[key] || i18n.en[key] || key;
}

// POST /api/chat - Process a natural language query
export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { message, dataSourceId, sessionId, queryRowLimit } = body;

    if (!message || !dataSourceId) {
      return NextResponse.json({ error: 'Message and dataSourceId are required' }, { status: 400 });
    }

    // Get data source with schema and context
    const datasource = await db.dataSource.findUnique({
      where: { id: dataSourceId },
      include: {
        schemas: true,
        contexts: true,
      },
    });

    if (!datasource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Verify the data source belongs to the authenticated user
    const isDatasourceOwner = await verifyOwnership(datasource.userId);
    if (!isDatasourceOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (datasource.status !== 'ready') {
      return NextResponse.json({ error: 'Data source is not ready for queries' }, { status: 400 });
    }

    // Detect user language for localized responses (early, so we can use it in error messages)
    const lang = detectLanguage(message);

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
      // Verify ownership of existing session
      const existingSession = await db.chatSession.findUnique({
        where: { id: chatSessionId },
      });
      if (!existingSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      const isSessionOwner = await verifyOwnership(existingSession.userId);
      if (!isSessionOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Generate SQL from natural language — with timeout
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
        30000,  // 30s timeout for SQL generation
        'SQL generation'
      );
    } catch (timeoutError) {
      console.error('SQL generation timed out or failed:', timeoutError);
      const errorMsg = timeoutError instanceof Error ? timeoutError.message : 'SQL generation failed';
      
      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'assistant',
          content: `## ${t(lang, 'queryExecutionError')}\n\n${errorMsg}`,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: `## ${t(lang, 'queryExecutionError')}\n\n${errorMsg}`,
          confidence: 0,
        },
      });
    }

    // Handle schema questions — build a rich response from stored metadata, no SQL execution
    if (sqlResult.type === 'schema_question') {
      const context = datasource.contexts[0];

      // Build table details with H3 sub-sections
      const tableDetails = datasource.schemas.map((s) => {
        const cols = JSON.parse(s.columns) as Array<{
          name: string;
          type: string;
          notNull: boolean;
          primaryKey: boolean;
          defaultValue?: string | null;
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

      // Build relationships section
      let relationshipsSection = '';
      if (context?.relationships) {
        try {
          const relationships = JSON.parse(context.relationships) as Array<{
            from: string;
            to: string;
            type: string;
            description: string;
          }>;
          if (relationships.length > 0) {
            relationshipsSection = `\n\n### ${t(lang, 'relationships')}\n` + relationships
              .map((r) => `- \`${r.from}\` → \`${r.to}\` (${r.type}) — ${r.description}`)
              .join('\n');
          }
        } catch {
          // Ignore parse errors for relationships
        }
      }

      // Build business glossary section
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
        } catch {
          // Ignore parse errors for glossary
        }
      }

      // Build summary section
      const summarySection = context?.summary
        ? `\n\n> ${context.summary}`
        : '';

      const schemaResponse = `## ${t(lang, 'schemaOverview')}\n\n${t(lang, 'thisDatabaseContains')} **${datasource.schemas.length}** ${t(lang, 'tables')}.${summarySection}\n\n${tableDetails.join('\n\n')}${relationshipsSection}${glossarySection}`;

      // Save assistant message
      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'assistant',
          content: schemaResponse,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: schemaResponse,
          confidence: sqlResult.confidence,
        },
      });
    }

    if (!sqlResult.sql || sqlResult.confidence === 0) {
      // Save assistant message explaining why we couldn't generate SQL
      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'assistant',
          content: `## ${t(lang, 'unableToGenerate')}\n\n${sqlResult.explanation || t(lang, 'unableToGenerateDesc')}`,
          sqlQuery: sqlResult.sql || null,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: `## ${t(lang, 'unableToGenerate')}\n\n${sqlResult.explanation || t(lang, 'unableToGenerateDesc')}`,
          sqlQuery: sqlResult.sql || null,
          confidence: sqlResult.confidence,
        },
      });
    }

    // Validate the generated SQL
    const validation = validateSQLQuery(sqlResult.sql);
    if (!validation.isSafe) {
      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'assistant',
          content: `## ${t(lang, 'queryBlocked')}\n\n${t(lang, 'queryBlockedDesc')} ${validation.errors.join(', ')}. ${t(lang, 'pleaseRephrase')}`,
          sqlQuery: sqlResult.sql,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: `## ${t(lang, 'queryBlocked')}\n\n${t(lang, 'queryBlockedDesc')} ${validation.errors.join(', ')}. ${t(lang, 'pleaseRephrase')}`,
          sqlQuery: sqlResult.sql,
          confidence: 0,
        },
      });
    }

    // Determine row limit for response slicing (0 = no limit)
    const responseRowLimit = typeof queryRowLimit === 'number' ? queryRowLimit : 500;

    // Execute the query with retry loop for schema hallucinations
    const MAX_RETRIES = 2;
    let queryResult;
    let finalSQL = sanitizeSQL(sqlResult.sql);
    let lastError = '';
    let retryCount = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        queryResult = executeSelectQuery(datasource.filePath, finalSQL);
        lastError = '';
        break; // Success — exit retry loop
      } catch (execError) {
        lastError = execError instanceof Error ? execError.message : 'Query execution failed';

        // Check if this is a "file not found" error — not retryable, fail immediately
        if (lastError.includes('file not found') || lastError.includes('Database file not found')) {
          console.error('[Chat] Database file not found:', lastError);
          break;
        }

        // Check if this is a retryable error (AI hallucinated a column/table name)
        if (attempt < MAX_RETRIES && isRetryableExecutionError(lastError)) {
          console.log(`[Chat] SQL execution failed (attempt ${attempt + 1}): ${lastError}. Retrying with feedback...`);

          // Ask the AI to regenerate the SQL with error feedback — with timeout
          try {
            const retryResult = await withTimeout(
              regenerateSQLWithFeedback(
                message,
                finalSQL,
                lastError,
                schemaDescription,
                semanticContext,
                queryRowLimit
              ),
              20000,  // 20s timeout for retry
              'SQL regeneration'
            );

            if (!retryResult.sql || retryResult.confidence === 0) {
              // AI couldn't fix it — break and report error
              console.log('[Chat] AI could not fix the SQL query on retry.');
              break;
            }

            // Validate the regenerated SQL
            const retryValidation = validateSQLQuery(retryResult.sql);
            if (!retryValidation.isSafe) {
              console.log(`[Chat] Regenerated SQL failed security check: ${retryValidation.errors.join(', ')}`);
              break;
            }

            finalSQL = sanitizeSQL(retryResult.sql);
            retryCount++;
            // Continue loop to try the new query
          } catch (retryTimeoutError) {
            console.error('[Chat] SQL regeneration timed out:', retryTimeoutError);
            break;
          }
        } else {
          // Non-retryable error or max retries exceeded
          break;
        }
      }
    }

    // If query still failed after retries
    if (!queryResult) {
      // Check if it's a file-not-found error
      const isFileNotFoundError = lastError.includes('file not found') || lastError.includes('Database file not found');
      const errorContent = isFileNotFoundError
        ? `## ${t(lang, 'fileNotFound')}\n\n${t(lang, 'fileNotFoundDesc')}`
        : `## ${t(lang, 'queryExecutionError')}${retryCount > 0 ? ` (${t(lang, 'retried')} ${retryCount} ${retryCount > 1 ? t(lang, 'times') : t(lang, 'time')} ${t(lang, 'withAIFeedback')})` : ''}\n\n${lastError}`;

      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'assistant',
          content: errorContent,
          sqlQuery: finalSQL,
        },
      });

      // Save to query history as failed
      await db.queryHistory.create({
        data: {
          dataSourceId,
          sessionId: chatSessionId,
          naturalQuery: message,
          sqlQuery: finalSQL,
          resultData: '[]',
          rowCount: 0,
          executionTime: 0,
          status: 'error',
          errorMessage: lastError,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: errorContent,
          sqlQuery: finalSQL,
          confidence: sqlResult.confidence,
        },
      });
    }

    // ============================================================
    // PERFORMANCE FIX: Run visualization + analysis IN PARALLEL
    // This reduces total time from (viz + analysis) to max(viz, analysis)
    // ============================================================

    // Slice results based on configured limit (0 = no limit / send all)
    const slicedData = responseRowLimit > 0
      ? queryResult.data.slice(0, responseRowLimit)
      : queryResult.data;

    const resultColumns = queryResult.columns || (slicedData.length > 0 ? Object.keys(slicedData[0]) : []);
    const sampleResults = queryResult.data.slice(0, 10);

    // Run visualization and analysis IN PARALLEL with independent timeouts
    const [vizResult, analysisResult] = await Promise.allSettled([
      // Visualization suggestion — 15s timeout
      withTimeout(
        suggestVisualization(finalSQL, queryResult.data, message),
        15000,
        'Visualization suggestion'
      ).catch(err => {
        console.error('Visualization suggestion failed:', err);
        return null;
      }),

      // Analysis — 20s timeout
      withTimeout(
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
      ).catch(err => {
        console.error('Analysis failed:', err);
        return null;
      }),
    ]);

    // Extract results
    const visualization = vizResult.status === 'fulfilled' ? vizResult.value : null;
    const analysisCompletion = analysisResult.status === 'fulfilled' ? analysisResult.value : null;

    let analysis = '';
    if (analysisCompletion?.content) {
      analysis = analysisCompletion.content;
    } else {
      // Fallback analysis
      analysis = `## ${t(lang, 'queryResults')}\n\n${t(lang, 'queryReturned')} **${queryResult.rowCount}** ${t(lang, 'rows')} ${t(lang, 'rowsIn')} **${queryResult.executionTime}ms**.`;
    }

    // Build the full response content — include retry note if applicable
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

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }
}
