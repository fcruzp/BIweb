import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSQLFromNaturalLanguage, regenerateSQLWithFeedback, isRetryableExecutionError, suggestVisualization, createCompletion, detectLanguage } from '@/lib/ai';
import { executeSelectQuery, generateSchemaDescription } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';

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
  },
};

function t(lang: string, key: string): string {
  return i18n[lang]?.[key] || i18n.en[key] || key;
}

// POST /api/chat - Process a natural language query
export async function POST(request: NextRequest) {
  try {
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

    if (datasource.status !== 'ready') {
      return NextResponse.json({ error: 'Data source is not ready for queries' }, { status: 400 });
    }

    // Get or create chat session
    let chatSessionId = sessionId;
    if (!chatSessionId) {
      const session = await db.chatSession.create({
        data: {
          dataSourceId,
          title: message.slice(0, 50),
        },
      });
      chatSessionId = session.id;
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

    // Generate SQL from natural language
    const sqlResult = await generateSQLFromNaturalLanguage(
      message,
      schemaDescription,
      semanticContext,
      previousQueries,
      queryRowLimit
    );

    // Detect user language for localized responses
    const lang = detectLanguage(message);

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

        // Check if this is a retryable error (AI hallucinated a column/table name)
        if (attempt < MAX_RETRIES && isRetryableExecutionError(lastError)) {
          console.log(`[Chat] SQL execution failed (attempt ${attempt + 1}): ${lastError}. Retrying with feedback...`);

          // Ask the AI to regenerate the SQL with error feedback
          const retryResult = await regenerateSQLWithFeedback(
            message,
            finalSQL,
            lastError,
            schemaDescription,
            semanticContext,
            queryRowLimit
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
        } else {
          // Non-retryable error or max retries exceeded
          break;
        }
      }
    }

    // If query still failed after retries
    if (!queryResult) {
      const errorRetryNote = retryCount > 0 ? ` (${t(lang, 'retried')} ${retryCount} ${retryCount > 1 ? t(lang, 'times') : t(lang, 'time')} ${t(lang, 'withAIFeedback')})` : '';
      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'assistant',
          content: `## ${t(lang, 'queryExecutionError')}${errorRetryNote}\n\n${lastError}`,
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
          content: `## ${t(lang, 'queryExecutionError')}${errorRetryNote}\n\n${lastError}`,
          sqlQuery: finalSQL,
          confidence: sqlResult.confidence,
        },
      });
    }

    // Get visualization suggestion
    let visualization = null;
    try {
      visualization = await suggestVisualization(finalSQL, queryResult.data, message);
    } catch (vizError) {
      console.error('Error suggesting visualization:', vizError);
    }

    // Analyze results with AI — include the actual column names so the AI doesn't hallucinate
    let analysis = '';
    try {
      const sampleResults = queryResult.data.slice(0, 10);
      const resultColumns = queryResult.columns || (queryResult.data.length > 0 ? Object.keys(queryResult.data[0]) : []);
      const analysisResult = await createCompletion({
        systemPrompt: `You are a senior business intelligence analyst writing a concise executive report. Analyze SQL query results and present insights in a professional, well-structured format.

CRITICAL RULES:
- ONLY reference column names that are listed in the "Result Columns" section below. Do NOT invent or assume any column names.
- If you mention a value from the data, make sure the column name you use matches exactly.
- Do NOT generate any SQL - only analyze the results and provide insights.

OUTPUT FORMAT — Use this structure:
## [Descriptive Title in Title Case]
Write a 1-2 sentence executive summary paragraph.

### Key Findings
- **[Metric Name]**: [Value with context]
- **[Metric Name]**: [Value with context]
- **[Metric Name]**: [Value with context]

### [Additional Section if warranted — trends, anomalies, breakdowns]
Write a brief analytical paragraph with data-driven insights.

### Recommended Follow-up
- [Specific, actionable question the user could ask next]
- [Specific, actionable question the user could ask next]

STYLE GUIDELINES:
- Use professional, confident language suitable for a C-suite audience
- Quantify insights with specific numbers and percentages from the data
- Highlight patterns, outliers, and business implications
- Keep paragraphs to 2-3 sentences maximum
- Use bold for key metrics and findings
- Write section headers in Title Case
- Be concise — the entire analysis should be scannable in under 30 seconds

LANGUAGE RULE — CRITICAL:
You MUST respond in the SAME LANGUAGE as the user's question. If the user wrote in Spanish, write the entire analysis in Spanish. If in English, write in English. If in Portuguese, write in Portuguese. If in French, write in French. Section headers, bullet points, and ALL human-readable text must match the user's language. SQL keywords and column names remain in their original form.`,
        userMessage: `Analyze these SQL query results:

Query: ${finalSQL}
Question: ${message}
Result Columns: ${resultColumns.join(', ')}
Total rows: ${queryResult.rowCount}
Execution time: ${queryResult.executionTime}ms${retryCount > 0 ? `\nNote: This query was auto-corrected after ${retryCount} attempt(s) due to column/table errors.` : ''}

Sample results:
${JSON.stringify(sampleResults, null, 2)}

Write a professional executive analysis using ONLY the column names listed above.`,
        temperature: 0.3,
      });
      analysis = analysisResult.content;
    } catch (analysisError) {
      console.error('Error analyzing results:', analysisError);
      analysis = `## ${t(lang, 'queryResults')}\n\n${t(lang, 'queryReturned')} ${queryResult.rowCount} ${t(lang, 'rows')} ${t(lang, 'rowsIn')} ${queryResult.executionTime}ms.`;
    }

    // Build the full response content — include retry note if applicable
    const retryNote = retryCount > 0
      ? ` (${t(lang, 'autoCorrected')} ${retryCount} ${retryCount > 1 ? t(lang, 'attempts') : t(lang, 'attempt')})`
      : '';
    const successMsg = t(lang, 'queryExecutedSuccessfully');
    const rowsWord = t(lang, 'rows');
    const responseContent = `${analysis}\n\n📊 **${successMsg}**${retryNote} (${queryResult.rowCount} ${rowsWord}, ${queryResult.executionTime}ms)`;

    // Slice results based on configured limit (0 = no limit / send all)
    const slicedData = responseRowLimit > 0
      ? queryResult.data.slice(0, responseRowLimit)
      : queryResult.data;

    // Save assistant message
    await db.chatMessage.create({
      data: {
        sessionId: chatSessionId,
        role: 'assistant',
        content: responseContent,
        sqlQuery: finalSQL,
        queryResult: JSON.stringify(slicedData),
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
          columns: queryResult.columns,
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
