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
    const { message, dataSourceId, sessionId } = body;

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
      previousQueries
    );

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

    // Save assistant message
    await db.chatMessage.create({
      data: {
        sessionId: chatSessionId,
        role: 'assistant',
        content: responseContent,
        sqlQuery: sanitizedSQL,
        queryResult: JSON.stringify(queryResult.data.slice(0, 100)),
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
        resultData: JSON.stringify(queryResult.data.slice(0, 100)),
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
          data: queryResult.data.slice(0, 100), // Limit to 100 rows in response
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
