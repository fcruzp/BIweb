import ZAI from 'z-ai-web-dev-sdk';
import OpenAI from 'openai';

// ============================================================
// Helpers
// ============================================================

/**
 * Extract JSON from a string that might be wrapped in markdown code blocks.
 * Handles: ```json\n{...}\n```, ```{...}```, or raw JSON.
 */
function extractJSON(text: string): string {
  // Try to find JSON inside markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a JSON object or array in the text
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  // Return as-is and let JSON.parse fail naturally
  return text.trim();
}

// ============================================================
// Types
// ============================================================

export interface AICompletionOptions {
  systemPrompt: string;
  userMessage: string;
  contextMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  /** Override provider for this call */
  provider?: 'z-ai' | 'openrouter';
  /** Override model for this call */
  modelId?: string;
  /** Override API key for this call */
  apiKey?: string;
}

export interface AICompletionResult {
  content: string;
  parsedJson?: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

// ============================================================
// Z-AI Provider (built-in, no key needed)
// ============================================================

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

async function createZAICompletion(options: AICompletionOptions): Promise<AICompletionResult> {
  const zai = await getZAI();

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

  // Parse JSON if requested
  if (options.responseFormat === 'json' && content) {
    try {
      const jsonStr = extractJSON(content);
      result.parsedJson = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Z-AI JSON response:', e);
      console.error('Raw content:', content.slice(0, 500));
    }
  }

  return result;
}

// ============================================================
// OpenRouter Provider (OpenAI-compatible API)
// ============================================================

function getOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://datamind.bi',
      'X-Title': 'DataMind BI',
    },
  });
}

async function createOpenRouterCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
  const apiKey = options.apiKey;
  if (!apiKey) {
    throw new Error('OpenRouter API key is required. Configure it in Settings.');
  }

  const client = getOpenAIClient(apiKey);
  const model = options.modelId || 'anthropic/claude-sonnet-4';

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: options.systemPrompt },
  ];

  if (options.contextMessages) {
    for (const msg of options.contextMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: options.userMessage });

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
  });

  const content = completion.choices[0]?.message?.content || '';

  return {
    content,
    usage: {
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
    },
  };
}

// ============================================================
// Unified AI Service
// ============================================================

/**
 * Create an AI completion using the configured provider.
 * 
 * Priority for choosing provider:
 * 1. options.provider (explicit override)
 * 2. Reads from AI config store
 * 3. Falls back to z-ai
 */
export async function createCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
  // Determine provider
  let provider = options.provider;
  let modelId = options.modelId;
  let apiKey = options.apiKey;

  // If not explicitly overridden, read from store
  if (!provider || !apiKey) {
    try {
      // Dynamic import to avoid circular deps — store is client-side only
      const { useAIConfigStore } = await import('@/stores/ai-config-store');
      const config = useAIConfigStore.getState();

      if (!provider) provider = config.provider;
      if (!modelId) modelId = config.getEffectiveModelId();
      if (!apiKey) apiKey = config.openrouterApiKey;
    } catch {
      // If store is not available (e.g., during SSR), default to z-ai
      if (!provider) provider = 'z-ai';
    }
  }

  // Route to the appropriate provider
  const enrichedOptions = { ...options, provider, modelId, apiKey };

  let result: AICompletionResult;
  if (provider === 'openrouter') {
    result = await createOpenRouterCompletion(enrichedOptions);
  } else {
    result = await createZAICompletion(enrichedOptions);
  }

  // Ensure JSON is parsed for both providers when responseFormat is json
  if (options.responseFormat === 'json' && !result.parsedJson && result.content) {
    try {
      const jsonStr = extractJSON(result.content);
      result.parsedJson = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI JSON response:', e);
      console.error('Raw content:', result.content.slice(0, 500));
    }
  }

  return result;
}

// ============================================================
// High-level AI Functions
// ============================================================

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
    summary: 'Database schema uploaded successfully. AI analysis incomplete — you can still query the data.',
  };
}

export type SQLGenerationResult = {
  type: 'query' | 'schema_question';
  sql: string;
  explanation: string;
  confidence: number;
};

export async function generateSQLFromNaturalLanguage(
  naturalQuery: string,
  schemaInfo: string,
  semanticContext: string,
  previousQueries?: Array<{ question: string; sql: string }>,
  queryRowLimit?: number
): Promise<SQLGenerationResult> {
  const contextMessages = previousQueries?.map(q => [
    { role: 'user' as const, content: q.question },
    { role: 'assistant' as const, content: `Generated SQL: ${q.sql}` },
  ]).flat() || [];

  const result = await createCompletion({
    systemPrompt: `You are an expert SQL analyst. Your job has TWO parts:

1. CLASSIFY the user's question as either "query" or "schema_question"
2. If it's a "query", generate a safe SQLite SELECT statement

CLASSIFICATION RULES:
- "schema_question": The user is asking ABOUT the database itself — its structure, tables, columns, relationships, schema, or metadata. They are NOT asking for data from the tables.
  Examples: "What tables are in the database?", "¿Cuáles tablas tenemos?", "Describe the schema", "What columns does the X table have?", "How are the tables related?", "What does this database contain?"
- "query": The user is asking for actual DATA — values, counts, aggregations, comparisons, trends.

CRITICAL SECURITY RULES:
- ONLY generate SELECT statements for "query" type. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or any modifying SQL.
${queryRowLimit !== undefined && queryRowLimit > 0 ? `- Always include a LIMIT clause with a maximum of ${queryRowLimit} rows unless the user specifically requests otherwise.` : queryRowLimit === 0 ? `- No LIMIT clause is required by default. You may omit the LIMIT clause, but still use reasonable limits for very large result sets to avoid performance issues.` : `- Always include a LIMIT clause (default 500 rows) unless the user specifically requests otherwise.`}
- Never use subqueries that modify data.
- Never use PRAGMA statements.
- NEVER query sqlite_master or any system/catalog tables — if the user asks about the schema, classify as "schema_question" instead.
- Only reference tables and columns that exist in the provided schema.
- If the question cannot be answered with a SELECT query, respond with an explanation of why.

RESPONSE FORMAT - You must respond with valid JSON only:
{
  "type": "query" or "schema_question",
  "sql": "the SELECT query (only if type=query, empty string if type=schema_question)",
  "explanation": "brief explanation of what the query does or what schema info the user is asking about",
  "confidence": 0.0-1.0
}

IMPORTANT: When type is "schema_question", do NOT generate any SQL. The system will use stored schema metadata to answer directly.`,
    userMessage: `DATABASE SCHEMA:
${schemaInfo}

SEMANTIC CONTEXT:
${semanticContext}

USER QUESTION: ${naturalQuery}

First classify this question, then generate a response accordingly.`,
    contextMessages,
    responseFormat: 'json',
    temperature: 0.1,
  });

  if (result.parsedJson) {
    const parsed = result.parsedJson as Record<string, unknown>;
    // Default to 'query' if type field is missing (backward compatibility)
    const type = (parsed.type === 'schema_question' ? 'schema_question' : 'query') as 'query' | 'schema_question';
    return {
      type,
      sql: typeof parsed.sql === 'string' ? parsed.sql : '',
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    };
  }

  return {
    type: 'query',
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

  return {
    chartType: 'table',
    title: 'Query Results',
    description: 'Data displayed in table format',
  };
}
