import ZAI from 'z-ai-web-dev-sdk';

// Singleton pattern for ZAI instance
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export interface AICompletionOptions {
  systemPrompt: string;
  userMessage: string;
  contextMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AICompletionResult {
  content: string;
  parsedJson?: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export async function createCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
  const zai = await getAI();

  const messages: Array<{ role: 'assistant' | 'user'; content: string }> = [
    { role: 'assistant', content: options.systemPrompt },
  ];

  if (options.contextMessages) {
    messages.push(...options.contextMessages);
  }

  messages.push({ role: 'user', content: options.userMessage });

  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  });

  const content = completion.choices[0]?.message?.content || '';

  const result: AICompletionResult = { content };

  if (options.responseFormat === 'json') {
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [, content];
      const jsonStr = jsonMatch[1] || content;
      result.parsedJson = JSON.parse(jsonStr.trim());
    } catch {
      // If parsing fails, return raw content
      console.warn('Failed to parse JSON from AI response');
    }
  }

  return result;
}

export async function analyzeSchemaWithContext(
  schemaInfo: string,
  sampleData: string
): Promise<{
  semanticContext: string;
  businessGlossary: Record<string, string>;
  relationships: Array<{ from: string; to: string; type: string; description: string }>;
  summary: string;
}> {
  const result = await createCompletion({
    systemPrompt: `You are a data analyst expert. Analyze database schemas and generate rich semantic metadata.
You must respond with valid JSON only, no markdown, no explanation outside the JSON.`,
    userMessage: `Analyze this database schema and sample data. Generate rich semantic metadata.

SCHEMA:
${schemaInfo}

SAMPLE DATA:
${sampleData}

Respond with a JSON object with these fields:
{
  "semanticContext": "A detailed description of the database purpose, its domain, and business context. Include what kind of business or domain this data represents.",
  "businessGlossary": { "tableName": "human-readable description", "columnName": "what this column means in business terms" },
  "relationships": [{ "from": "table.column", "to": "table.column", "type": "one-to-many|many-to-one|one-to-one|many-to-many", "description": "why this relationship exists" }],
  "summary": "A concise 2-3 sentence summary of what this database contains and its purpose"
}`,
    responseFormat: 'json',
    temperature: 0.3,
  });

  if (result.parsedJson) {
    return result.parsedJson as typeof analyzeSchemaWithContext extends (...args: unknown[]) => Promise<infer R> ? R : never;
  }

  // Fallback
  return {
    semanticContext: 'Schema analysis could not be fully parsed.',
    businessGlossary: {},
    relationships: [],
    summary: 'Database schema uploaded successfully. AI analysis incomplete - you can still query the data.',
  };
}

export async function generateSQLFromNaturalLanguage(
  naturalQuery: string,
  schemaInfo: string,
  semanticContext: string,
  previousQueries?: Array<{ question: string; sql: string }>
): Promise<{
  sql: string;
  explanation: string;
  confidence: number;
}> {
  const contextMessages = previousQueries?.map(q => [
    { role: 'user' as const, content: q.question },
    { role: 'assistant' as const, content: `Generated SQL: ${q.sql}` },
  ]).flat() || [];

  const result = await createCompletion({
    systemPrompt: `You are an expert SQL analyst. Convert natural language questions to SQLite-compatible SQL queries.

CRITICAL SECURITY RULES:
- ONLY generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or any modifying SQL.
- Always include a LIMIT clause (max 1000 rows) unless the user specifically requests otherwise.
- Never use subqueries that modify data.
- Never use PRAGMA statements.
- Only reference tables and columns that exist in the provided schema.
- If the question cannot be answered with a SELECT query, respond with an explanation of why.

RESPONSE FORMAT - You must respond with valid JSON only:
{
  "sql": "the SELECT query",
  "explanation": "brief explanation of what the query does",
  "confidence": 0.0-1.0
}

If the query cannot be safely answered with a SELECT statement, set confidence to 0 and explain why.`,
    userMessage: `DATABASE SCHEMA:
${schemaInfo}

SEMANTIC CONTEXT:
${semanticContext}

USER QUESTION: ${naturalQuery}

Generate a safe SQLite SELECT query to answer this question.`,
    contextMessages,
    responseFormat: 'json',
    temperature: 0.1,
  });

  if (result.parsedJson) {
    return result.parsedJson as {
      sql: string;
      explanation: string;
      confidence: number;
    };
  }

  return {
    sql: '',
    explanation: 'Failed to generate SQL query. Please try rephrasing your question.',
    confidence: 0,
  };
}

export async function suggestVisualization(
  sqlQuery: string,
  resultData: Array<Record<string, unknown>>,
  naturalQuery: string
): Promise<{
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric';
  title: string;
  description: string;
  xAxis?: string;
  yAxis?: string[];
  colorBy?: string;
  metrics?: Array<{ label: string; value: number; format?: string }>;
}> {
  // Sample the data to avoid sending too much
  const sampleRows = resultData.slice(0, 20);
  const columns = resultData.length > 0 ? Object.keys(resultData[0]) : [];

  const result = await createCompletion({
    systemPrompt: `You are a data visualization expert. Analyze query results and recommend the best visualization type.

Respond with valid JSON only:
{
  "chartType": "bar|line|pie|scatter|area|table|metric",
  "title": "Descriptive chart title",
  "description": "What this visualization shows",
  "xAxis": "column name for x-axis (if chart type needs it)",
  "yAxis": ["column names for y-axis"],
  "colorBy": "column name to color segments by (optional)",
  "metrics": [{ "label": "metric name", "value": number, "format": "number|currency|percent" }] (for metric type)
}

Rules:
- Use "bar" for comparing categories
- Use "line" for trends over time
- Use "pie" for proportions (max 8 slices)
- Use "scatter" for correlations
- Use "area" for cumulative trends
- Use "metric" when the result is a single aggregated value
- Use "table" for detailed multi-column data that doesn't fit a chart
- Pick the BEST chart type for the data, not just any chart`,
    userMessage: `QUERY: ${sqlQuery}

NATURAL LANGUAGE QUESTION: ${naturalQuery}

RESULT COLUMNS: ${columns.join(', ')}

SAMPLE DATA (first 20 rows):
${JSON.stringify(sampleRows, null, 2)}

TOTAL ROWS: ${resultData.length}

Recommend the best visualization for this data.`,
    responseFormat: 'json',
    temperature: 0.3,
  });

  if (result.parsedJson) {
    return result.parsedJson as {
      chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric';
      title: string;
      description: string;
      xAxis?: string;
      yAxis?: string[];
      colorBy?: string;
      metrics?: Array<{ label: string; value: number; format?: string }>;
    };
  }

  // Fallback to table
  return {
    chartType: 'table',
    title: 'Query Results',
    description: 'Data displayed in table format',
  };
}
