import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSQLFromNaturalLanguage, suggestVisualization, createCompletion } from '@/lib/ai';
import { executeSelectQuery, generateSchemaDescription } from '@/lib/sqlite';
import { validateSQLQuery, sanitizeSQL } from '@/lib/sql-security';
import { SYSTEM_PROMPTS } from '@/lib/prompts';

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

    // Handle schema questions — build a rich response from stored metadata, no SQL execution
    if (sqlResult.type === 'schema_question') {
      const context = datasource.contexts[0];

      // Build table details
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
            return `  • \`${c.name}\` (${c.type})${flagStr}`;
          })
          .join('\n');
        return `**${s.tableName}** (${s.rowCount} rows)\n${columnList}`;
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
            relationshipsSection = '\n\n**Relationships:**\n' + relationships
              .map((r) => `  • \`${r.from}\` → \`${r.to}\` (${r.type}) — ${r.description}`)
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
            glossarySection = '\n\n**Business Glossary:**\n' + entries
              .map(([term, def]) => `  • **${term}**: ${def}`)
              .join('\n');
          }
        } catch {
          // Ignore parse errors for glossary
        }
      }

      // Build summary section
      const summarySection = context?.summary
        ? `\n\n**Summary:** ${context.summary}`
        : '';

      const schemaResponse = `📋 **Database Schema Information**\n\n${tableDetails.join('\n\n')}${summarySection}${relationshipsSection}${glossarySection}`;

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
          content: sqlResult.explanation || 'I could not generate a SQL query for your question. Please try rephrasing.',
          sqlQuery: sqlResult.sql || null,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: sqlResult.explanation || 'I could not generate a SQL query for your question. Please try rephrasing.',
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
          content: `The generated query was blocked for security reasons: ${validation.errors.join(', ')}. Please rephrase your question.`,
          sqlQuery: sqlResult.sql,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: `The generated query was blocked for security reasons: ${validation.errors.join(', ')}. Please rephrase your question.`,
          sqlQuery: sqlResult.sql,
          confidence: 0,
        },
      });
    }

    // Determine row limit for response slicing (0 = no limit)
    const responseRowLimit = typeof queryRowLimit === 'number' ? queryRowLimit : 500;

    // Execute the query
    const sanitizedSQL = sanitizeSQL(sqlResult.sql);
    let queryResult;
    try {
      queryResult = executeSelectQuery(datasource.filePath, sanitizedSQL);
    } catch (execError) {
      const errorMessage = execError instanceof Error ? execError.message : 'Query execution failed';
      await db.chatMessage.create({
        data: {
          sessionId: chatSessionId,
          role: 'assistant',
          content: `Error executing query: ${errorMessage}`,
          sqlQuery: sanitizedSQL,
        },
      });

      // Save to query history as failed
      await db.queryHistory.create({
        data: {
          dataSourceId,
          sessionId: chatSessionId,
          naturalQuery: message,
          sqlQuery: sanitizedSQL,
          resultData: '[]',
          rowCount: 0,
          executionTime: 0,
          status: 'error',
          errorMessage,
        },
      });

      return NextResponse.json({
        sessionId: chatSessionId,
        message: {
          role: 'assistant',
          content: `Error executing query: ${errorMessage}`,
          sqlQuery: sanitizedSQL,
          confidence: sqlResult.confidence,
        },
      });
    }

    // Get visualization suggestion
    let visualization = null;
    try {
      visualization = await suggestVisualization(sanitizedSQL, queryResult.data, message);
    } catch (vizError) {
      console.error('Error suggesting visualization:', vizError);
    }

    // Analyze results with AI
    let analysis = '';
    try {
      const sampleResults = queryResult.data.slice(0, 10);
      const analysisResult = await createCompletion({
        systemPrompt: SYSTEM_PROMPTS.resultAnalysis,
        userMessage: `Analyze these SQL query results:

Query: ${sanitizedSQL}
Question: ${message}
Total rows: ${queryResult.rowCount}
Execution time: ${queryResult.executionTime}ms

Sample results:
${JSON.stringify(sampleResults, null, 2)}

Provide a concise analysis with key insights.`,
        temperature: 0.3,
      });
      analysis = analysisResult.content;
    } catch (analysisError) {
      console.error('Error analyzing results:', analysisError);
      analysis = `Query returned ${queryResult.rowCount} rows in ${queryResult.executionTime}ms.`;
    }

    // Build the full response content
    const responseContent = `${analysis}\n\n📊 **Query executed successfully** (${queryResult.rowCount} rows, ${queryResult.executionTime}ms)`;

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
        sqlQuery: sanitizedSQL,
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
        sqlQuery: sanitizedSQL,
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
        sqlQuery: sanitizedSQL,
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
