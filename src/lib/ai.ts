import ZAI from 'z-ai-web-dev-sdk';
import OpenAI from 'openai';

// ============================================================
// Language Detection
// ============================================================

/**
 * Detect the language of a given text based on common patterns.
 * Returns a BCP 47 language tag (e.g., 'es', 'en', 'fr', 'pt').
 * This is a simple heuristic — the AI will also be instructed to match language.
 */
export function detectLanguage(text: string): string {
  const lower = text.toLowerCase();

  // Spanish indicators
  const spanishPatterns = [
    /\b(qué|cuál|cuáles|cómo|cuándo|dónde|por qué|quién|quiénes)\b/i,
    /\b(el|la|los|las|un|una|unos|unas)\b/g,
    /\b(es|son|está|están|hay|tiene|tienen|puede|pueden)\b/g,
    /\b(de|del|en|con|por|para|entre|sobre|sin|hasta|desde|hacia)\b/g,
    /\b(muy|más|menos|también|además|siempre|nunca|todo|nada|algo)\b/g,
    /\b(que|pero|porque|aunque|cuando|donde|como|sino|si)\b/g,
    /\b(cuantos|cuantas|cuanto|cuanta|muestra|dime|dame|lista|total)\b/g,
    /\b(provincia|provincias|región|regiones|ventas|clientes|productos|año|mes|día)\b/g,
    /\b[áéíóúñü]/g,
  ];

  const spanishScore = spanishPatterns.reduce((score, pattern) => {
    const matches = lower.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);

  // English indicators
  const englishPatterns = [
    /\b(what|which|how|when|where|why|who|whom)\b/g,
    /\b(the|a|an|is|are|was|were|be|been|being)\b/g,
    /\b(have|has|had|do|does|did|will|would|shall|should|can|could|may|might)\b/g,
    /\b(of|in|to|for|with|on|at|from|by|about|into|through|during|before|after)\b/g,
    /\b(very|more|less|also|always|never|every|some|any|many|much|few)\b/g,
    /\b(show|tell|list|give|count|sum|average|total|display|find|get)\b/g,
    /\b(province|provinces|region|regions|sales|customers|products|year|month|day)\b/g,
  ];

  const englishScore = englishPatterns.reduce((score, pattern) => {
    const matches = lower.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);

  // Portuguese indicators
  const portuguesePatterns = [
    /\b(qual|quais|como|quando|onde|porque|quem)\b/g,
    /\b(o|a|os|as|um|uma|uns|umas)\b/g,
    /\b(é|são|está|estão|tem|têm|pode|podem)\b/g,
    /\b(muito|mais|menos|também|sempre|nunca|tudo|nada|algo)\b/g,
    /\b[ãõçâêîôû]/g,
  ];

  const portugueseScore = portuguesePatterns.reduce((score, pattern) => {
    const matches = lower.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);

  // French indicators
  const frenchPatterns = [
    /\b(quel|quelle|quels|quelles|comment|quand|où|pourquoi|qui)\b/g,
    /\b(le|la|les|un|une|des)\b/g,
    /\b(est|sont|a|ont|peut|peuvent|fait|font)\b/g,
    /\b[àâçéèêëîïôùûüÿœæ]/g,
  ];

  const frenchScore = frenchPatterns.reduce((score, pattern) => {
    const matches = lower.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);

  const scores: Record<string, number> = {
    es: spanishScore,
    en: englishScore,
    pt: portugueseScore,
    fr: frenchScore,
  };

  // Return the language with the highest score, defaulting to 'en'
  const maxLang = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a, ['en', 0]);
  return maxLang[1] > 0 ? maxLang[0] : 'en';
}

/**
 * Generate a language instruction string to append to AI prompts.
 * Tells the AI to respond in the same language as the user's question.
 */
export function getLanguageInstruction(userMessage: string): string {
  const lang = detectLanguage(userMessage);
  const langNames: Record<string, string> = {
    es: 'Spanish',
    en: 'English',
    pt: 'Portuguese',
    fr: 'French',
  };
  const langName = langNames[lang] || 'English';

  return `\nLANGUAGE RULE — CRITICAL:\nYou MUST respond in ${langName}. The user wrote their question in ${langName}, so your explanation, title, description, and all human-readable text MUST be in ${langName}. SQL keywords and column names remain in their original form, but everything else must be in ${langName}.`;
}

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

  // Try to find a JSON object in the text (greedy to catch nested objects)
  // Use a more robust match that handles nested braces
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

/**
 * Extract SQL from plain text responses where the AI ignored the JSON format instruction
 * and returned something like "Generated SQL: SELECT ..." instead of proper JSON.
 * Returns a JSON string in the expected format, or null if no SQL could be extracted.
 */
function extractSQLFromPlainText(text: string): { type: 'query'; sql: string; explanation: string; confidence: number } | null {
  // Common patterns where AI prefixes SQL with a label
  const sqlPrefixPatterns = [
    /(?:Generated\s+SQL|SQL|Query|SQL\s+Query|Generated\s+Query)\s*[:\-=]\s*\n?/i,
    /(?:Here(?:'s|\s+is)\s+(?:the\s+)?(?:SQL|query))\s*[:\-=]?\s*\n?/i,
    /(?:The\s+(?:SQL|query)\s+(?:is|would\s+be))\s*[:\-=]?\s*\n?/i,
  ];

  let sqlText: string | null = null;

  for (const pattern of sqlPrefixPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Extract everything after the prefix label
      const afterPrefix = text.slice(match.index! + match[0].length);
      // Try to find a SELECT statement
      const selectMatch = afterPrefix.match(/((?:SELECT|select)[\s\S]*?)(?:;\s*$|\n\n|$)/);
      if (selectMatch) {
        sqlText = selectMatch[1].trim().replace(/;$/, '');
        break;
      }
    }
  }

  // If no prefix pattern matched, look for a bare SELECT statement
  if (!sqlText) {
    const selectMatch = text.match(/((?:SELECT|select)\s[\s\S]*?)(?:;\s*$|\n\n|$)/);
    if (selectMatch) {
      sqlText = selectMatch[1].trim().replace(/;$/, '');
    }
  }

  if (!sqlText) {
    return null;
  }

  // Try to extract an explanation from the text as well
  let explanation = 'Extracted from AI plain text response';
  const explanationPatterns = [
    /(?:Explanation|Description|Reasoning|Note)\s*[:\-=]\s*\n?([\s\S]*?)(?:\n\n|(?:Generated\s+SQL|SQL|Query))/i,
    /(?:This\s+query|The\s+query|This\s+SQL)\s+([\s\S]*?)(?:\n\n|(?:Generated\s+SQL|SQL|Query))/i,
  ];
  for (const pattern of explanationPatterns) {
    const match = text.match(pattern);
    if (match) {
      explanation = match[1].trim();
      break;
    }
  }

  return {
    type: 'query',
    sql: sqlText,
    explanation,
    confidence: 0.5,
  };
}

/**
 * Extract visualization suggestion from plain text responses where the AI
 * ignored the JSON format instruction and returned text instead of JSON.
 * Returns a visualization object, or null if nothing useful could be extracted.
 */
function extractVisualizationFromPlainText(
  text: string,
  columns: string[]
): { chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric'; title: string; description: string; xAxis?: string; yAxis?: string[] } | null {
  // Try to detect chart type mentions in plain text
  const chartTypeMap: Record<string, 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric'> = {
    'bar chart': 'bar', 'bar': 'bar', 'column chart': 'bar',
    'line chart': 'line', 'line': 'line', 'line graph': 'line', 'trend': 'line',
    'pie chart': 'pie', 'pie': 'pie', 'donut': 'pie',
    'scatter plot': 'scatter', 'scatter': 'scatter', 'scatter chart': 'scatter',
    'area chart': 'area', 'area': 'area',
    'metric': 'metric', 'kpi': 'metric', 'single value': 'metric',
    'table': 'table', 'data table': 'table', 'grid': 'table',
  };

  let detectedChartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | null = null;
  const lowerText = text.toLowerCase();

  for (const [keyword, chartType] of Object.entries(chartTypeMap)) {
    if (lowerText.includes(keyword)) {
      detectedChartType = chartType;
      break;
    }
  }

  if (!detectedChartType) {
    return null;
  }

  // Try to find axis/column references in the text
  let xAxis: string | undefined;
  let yAxis: string[] = [];

  // Look for column names mentioned in the text
  const mentionedColumns = columns.filter(col =>
    lowerText.includes(col.toLowerCase())
  );

  if (mentionedColumns.length > 0) {
    xAxis = mentionedColumns[0];
    yAxis = mentionedColumns.slice(1);
  }

  // Try to extract a title
  let title = 'Query Results';
  const titleMatch = text.match(/(?:title|chart\s+title|name)\s*[:\-=]\s*"?([^"\n]+)"?/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  return {
    chartType: detectedChartType,
    title,
    description: text.slice(0, 200).trim(),
    xAxis,
    yAxis: yAxis.length > 0 ? yAxis : undefined,
  };
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

/** AI config passed from client-side to server-side API routes */
export interface AIClientConfig {
  provider?: 'z-ai' | 'openrouter';
  modelId?: string;
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
let zaiAvailable: boolean | null = null;

async function getZAI() {
  if (zaiAvailable === false) {
    throw new Error('Z-AI is not available in this environment. Please configure OpenRouter in Settings.');
  }
  try {
    if (!zaiInstance) {
      zaiInstance = await ZAI.create();
      zaiAvailable = true;
    }
    return zaiInstance;
  } catch (error) {
    zaiAvailable = false;
    throw new Error('Z-AI is not available in this environment. Please configure OpenRouter in Settings.');
  }
}

async function createZAICompletion(options: AICompletionOptions): Promise<AICompletionResult> {
  const startTime = Date.now();
  try {
    const zai = await getZAI();

    const messages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [
      { role: 'system', content: options.systemPrompt },
    ];

    if (options.contextMessages) {
      messages.push(...options.contextMessages);
    }

    messages.push({ role: 'user', content: options.userMessage });

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    }).catch(async (err) => {
      // Retry once after 60s for transient failures
      console.warn('[Z-AI] Transient error, retrying in 60s:', err?.message || err);
      await new Promise(r => setTimeout(r, 60000));
      return zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log(`[Z-AI] Completion took ${Date.now() - startTime}ms, content length: ${content.length}`);

    const result: AICompletionResult = { content };

    // Parse JSON if requested
    if (options.responseFormat === 'json' && content) {
      try {
        const jsonStr = extractJSON(content);
        result.parsedJson = JSON.parse(jsonStr);
      } catch (e) {
        console.warn('Z-AI did not return valid JSON, attempting plain text fallback:', (e as Error).message);
        console.debug('Raw content:', content.slice(0, 500));

        // Fallback: try to extract structured data from plain text
        const sqlFallback = extractSQLFromPlainText(content);
        if (sqlFallback) {
          console.info('Successfully extracted SQL from Z-AI plain text response');
          result.parsedJson = sqlFallback;
        }
      }
    }

    return result;
  } catch (error) {
    const errInfo = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack?.slice(0, 500) }
      : { message: String(error) };
    console.error(`[Z-AI] Completion FAILED after ${Date.now() - startTime}ms:`, errInfo);
    throw error;
  }
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
  // NOTE: On the server side (API routes), the Zustand store uses default values
  // since localStorage is not available. This means the server always uses z-ai
  // unless the caller explicitly passes provider/apiKey/modelId.
  if (!provider || !apiKey) {
    try {
      // Dynamic import to avoid circular deps — store is client-side only
      const { useAIConfigStore } = await import('@/stores/ai-config-store');
      const config = useAIConfigStore.getState();

      if (!provider) provider = config.provider;
      if (!modelId) modelId = config.getEffectiveModelId();
      if (!apiKey) apiKey = config.openrouterApiKey;
    } catch (storeError) {
      // If store is not available (e.g., during SSR), default to z-ai
      console.log(`[AI] Config store not available (${storeError instanceof Error ? storeError.message : 'unknown'}), using z-ai`);
      if (!provider) provider = 'z-ai';
    }
  }

  // Route to the appropriate provider
  console.log(`[AI] Using provider: ${provider}, model: ${modelId || 'default'}`);
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
      console.warn('AI response is not valid JSON, attempting plain text fallback:', (e as Error).message);
      console.debug('Raw content:', result.content.slice(0, 500));

      // Fallback: try to extract structured data from plain text
      const sqlFallback = extractSQLFromPlainText(result.content);
      if (sqlFallback) {
        console.info('Successfully extracted SQL from AI plain text response');
        result.parsedJson = sqlFallback;
      }
    }
  }

  return result;
}

// ============================================================
// High-level AI Functions
// ============================================================

export async function analyzeSchemaWithContext(
  schemaInfo: string,
  sampleData: string,
  aiConfig?: AIClientConfig
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
    ...aiConfig,
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
  queryRowLimit?: number,
  aiConfig?: AIClientConfig
): Promise<SQLGenerationResult> {
  const contextMessages = previousQueries?.map(q => [
    { role: 'user' as const, content: q.question },
    { role: 'assistant' as const, content: JSON.stringify({ type: 'query', sql: q.sql, explanation: 'Previous query', confidence: 0.9 }) },
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

IMPORTANT: When type is "schema_question", do NOT generate any SQL. The system will use stored schema metadata to answer directly.${getLanguageInstruction(naturalQuery)}`,
    userMessage: `DATABASE SCHEMA:
${schemaInfo}

SEMANTIC CONTEXT:
${semanticContext}

USER QUESTION: ${naturalQuery}

Respond with valid JSON only. No explanation outside the JSON object.`,
    contextMessages,
    responseFormat: 'json',
    temperature: 0.1,
    ...aiConfig,
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

  // Fallback: If JSON parsing failed but the response contains a SQL SELECT statement,
  // try to extract it directly (in case the AI responded in plain text format)
  const sqlMatch = result.content.match(/(?:SELECT|select)[\s\S]*?(?:;|$)/);
  if (sqlMatch) {
    return {
      type: 'query',
      sql: sqlMatch[0].trim().replace(/;$/, ''),
      explanation: 'Generated SQL query from natural language.',
      confidence: 0.5,
    };
  }

  return {
    type: 'query',
    sql: '',
    explanation: 'Failed to generate SQL query. Please try rephrasing your question.',
    confidence: 0,
  };
}

/**
 * Regenerate SQL with error feedback when the previous query failed.
 * Feeds the execution error and correct schema back to the AI so it can fix the query.
 */
export async function regenerateSQLWithFeedback(
  naturalQuery: string,
  failedSQL: string,
  executionError: string,
  schemaInfo: string,
  semanticContext: string,
  queryRowLimit?: number,
  aiConfig?: AIClientConfig
): Promise<SQLGenerationResult> {
  const result = await createCompletion({
    systemPrompt: `You are an expert SQL analyst. A previous SQL query you generated FAILED when executed against the database. You must fix it.

CRITICAL: The previous query had an execution error. Common causes include:
1. Syntax errors: Using "=>" instead of "AS", missing commas, incorrect operators, misplaced parentheses, etc.
2. Referencing columns or tables that don't exist in the database.
3. Invalid function calls or wrong number of arguments.
4. Misuse of SQL keywords or aggregates.

You MUST:
- Carefully review the CORRECT schema provided below and generate a query that ONLY uses columns and tables that actually exist.
- Fix any SQL syntax errors. Use standard SQLite syntax only.
- Use "AS" keyword for column aliases (never "=>").
- Ensure all commas, parentheses, and operators are correct.

SECURITY RULES:
- ONLY generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or any modifying SQL.
${queryRowLimit !== undefined && queryRowLimit > 0 ? `- Always include a LIMIT clause with a maximum of ${queryRowLimit} rows unless the user specifically requests otherwise.` : queryRowLimit === 0 ? `- No LIMIT clause is required by default.` : `- Always include a LIMIT clause (default 500 rows) unless the user specifically requests otherwise.`}
- Never use subqueries that modify data.
- Never use PRAGMA statements.
- Only reference tables and columns that EXIST in the provided schema.

RESPONSE FORMAT - You must respond with valid JSON only:
{
  "type": "query",
  "sql": "the corrected SELECT query",
  "explanation": "brief explanation of what was fixed and what the query does",
  "confidence": 0.0-1.0
}${getLanguageInstruction(naturalQuery)}`,
    userMessage: `USER QUESTION: ${naturalQuery}

PREVIOUS FAILED SQL:
${failedSQL}

EXECUTION ERROR:
${executionError}

CORRECT DATABASE SCHEMA (use ONLY these tables and columns):
${schemaInfo}

SEMANTIC CONTEXT:
${semanticContext}

Fix the SQL query. Pay close attention to:
- SQL SYNTAX: Ensure correct syntax (use "AS" for aliases, proper commas, parentheses, operators). The error message above tells you exactly what went wrong.
- COLUMN/TABLE NAMES: Only use columns and tables that exist in the schema above. Do not guess or invent column names.

Respond with valid JSON only. No explanation outside the JSON object.`,
    responseFormat: 'json',
    temperature: 0.1,
    ...aiConfig,
  });

  if (result.parsedJson) {
    const parsed = result.parsedJson as Record<string, unknown>;
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
    explanation: 'Failed to regenerate SQL query after error. Please try rephrasing your question.',
    confidence: 0,
  };
}

/**
 * Check if an execution error is retryable (schema-related or syntax-related).
 * We retry on errors that indicate the AI hallucinated columns/tables
 * OR generated invalid SQL syntax that can be fixed with feedback.
 */
export function isRetryableExecutionError(errorMessage: string): boolean {
  const retryablePatterns = [
    // Schema hallucination errors
    /no such column/i,
    /no such table/i,
    /table.*does not exist/i,
    /column.*does not exist/i,
    /has no column/i,
    /ambiguous column/i,
    /no column named/i,
    /could not find column/i,
    /unknown column/i,
    /invalid column/i,
    // SQL syntax errors — the AI can often fix these when given feedback
    /syntax error/i,
    /near ".*": syntax error/i,
    /incomplete input/i,
    /unexpected token/i,
    /unexpected keyword/i,
    /unexpected end/i,
    /misuse of aggregate/i,
    /wrong number of arguments/i,
    /sub-select returns more than one row/i,
    /no such function/i,
    /invalid use of/i,
    /misuse of/i,
    /parser error/i,
    /parse error/i,
    /unrecognized token/i,
  ];
  return retryablePatterns.some(pattern => pattern.test(errorMessage));
}

export async function suggestVisualization(
  sqlQuery: string,
  resultData: Array<Record<string, unknown>>,
  naturalQuery: string,
  aiConfig?: AIClientConfig
): Promise<{
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'heatmap';
  title: string;
  description: string;
  xAxis?: string;
  yAxis?: string[];
  colorBy?: string;
  metrics?: Array<{ label: string; value: number; format?: string }>;
  /** Province column name for heatmap visualization */
  provinceColumn?: string;
  /** Value column name for heatmap visualization */
  valueColumn?: string;
}> {
  const sampleRows = resultData.slice(0, 20);
  const columns = resultData.length > 0 ? Object.keys(resultData[0]) : [];

  // ---- GEOGRAPHIC DETECTION (before AI call) ----
  // Check if the query or data looks geographic (DR provinces)
  const geoKeywords = [
    'provincia', 'province', 'mapa', 'map', 'geográf', 'geograph',
    'región', 'region', 'heatmap', 'heat map', 'mapa de calor',
    'por provincia', 'by province', 'por región', 'by region',
    'distribución geográfica', 'geographic distribution',
  ];
  const lowerQuery = naturalQuery.toLowerCase();
  const isGeoQuery = geoKeywords.some(kw => lowerQuery.includes(kw));

  // Check if data contains DR province-like values
  let hasProvinceValues = false;
  let detectedProvinceCol: string | null = null;
  let detectedValueCol: string | null = null;

  for (const col of columns) {
    const lowerCol = col.toLowerCase();
    const isLikelyProvinceCol =
      lowerCol.includes('provincia') ||
      lowerCol.includes('province') ||
      lowerCol.includes('region') ||
      lowerCol.includes('región') ||
      lowerCol.includes('state') ||
      lowerCol.includes('estado') ||
      lowerCol.includes('municipio') ||
      lowerCol.includes('municipality') ||
      lowerCol.includes('location') ||
      lowerCol.includes('ubicación');

    if (isLikelyProvinceCol) {
      // Validate that the values look like DR provinces
      const values = resultData.slice(0, 30).map(r => String(r[col] ?? ''));
      const drProvinceNames = [
        'Distrito Nacional', 'Azua', 'Baoruco', 'Barahona', 'Dajabón', 'Duarte',
        'El Seibo', 'Espaillat', 'Hato Mayor', 'Hermanas Mirabal',
        'Independencia', 'La Altagracia', 'La Estrelleta', 'Elías Piña', 'La Romana', 'La Vega',
        'María Trinidad Sánchez', 'Monseñor Nouel', 'Monte Cristi', 'Monte Plata',
        'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'Sánchez Ramírez',
        'San Cristóbal', 'San José de Ocoa', 'San Juan', 'San Pedro de Macorís',
        'Santiago', 'Santiago Rodríguez', 'Santo Domingo', 'Valverde',
      ];
      const matchCount = values.filter(v => {
        const vLower = v.toLowerCase().trim();
        return drProvinceNames.some(p => p.toLowerCase() === vLower);
      }).length;

      if (matchCount >= Math.max(2, values.length * 0.25)) {
        hasProvinceValues = true;
        detectedProvinceCol = col;
        // Find the numeric value column
        detectedValueCol = columns.find(c => {
          if (c === col) return false;
          return resultData.slice(0, 10).some(r => {
            const val = r[c];
            return typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '');
          });
        }) || null;
        break;
      }
    }
  }

  // If no column name match, try to detect by values alone
  if (!hasProvinceValues) {
    const drProvinceNames = [
      'Distrito Nacional', 'Azua', 'Baoruco', 'Barahona', 'Dajabón', 'Duarte',
      'El Seibo', 'Espaillat', 'Hato Mayor', 'Hermanas Mirabal',
      'Independencia', 'La Altagracia', 'La Estrelleta', 'Elías Piña', 'La Romana', 'La Vega',
      'María Trinidad Sánchez', 'Monseñor Nouel', 'Monte Cristi', 'Monte Plata',
      'Pedernales', 'Peravia', 'Puerto Plata', 'Samaná', 'Sánchez Ramírez',
      'San Cristóbal', 'San José de Ocoa', 'San Juan', 'San Pedro de Macorís',
      'Santiago', 'Santiago Rodríguez', 'Santo Domingo', 'Valverde',
    ];
    for (const col of columns) {
      const values = resultData.slice(0, 30).map(r => String(r[col] ?? '').toLowerCase().trim());
      const matchCount = values.filter(v =>
        drProvinceNames.some(p => p.toLowerCase() === v)
      ).length;
      if (matchCount >= Math.max(3, values.length * 0.3)) {
        hasProvinceValues = true;
        detectedProvinceCol = col;
        detectedValueCol = columns.find(c => {
          if (c === col) return false;
          return resultData.slice(0, 10).some(r => typeof r[c] === 'number');
        }) || null;
        break;
      }
    }
  }

  // If this is a geographic query or data looks geographic, return heatmap
  if ((isGeoQuery || hasProvinceValues) && detectedProvinceCol && detectedValueCol) {
    const lang = detectLanguage(naturalQuery);
    const heatmapTitles: Record<string, string> = {
      es: `Mapa de Calor — ${naturalQuery.slice(0, 60)}`,
      en: `Heat Map — ${naturalQuery.slice(0, 60)}`,
      pt: `Mapa de Calor — ${naturalQuery.slice(0, 60)}`,
      fr: `Carte de Chaleur — ${naturalQuery.slice(0, 60)}`,
    };
    const heatmapDescs: Record<string, string> = {
      es: `Mapa de calor de ${detectedProvinceCol} por ${detectedValueCol}`,
      en: `Heat map of ${detectedProvinceCol} by ${detectedValueCol}`,
      pt: `Mapa de calor de ${detectedProvinceCol} por ${detectedValueCol}`,
      fr: `Carte de chaleur de ${detectedProvinceCol} par ${detectedValueCol}`,
    };
    return {
      chartType: 'heatmap',
      title: heatmapTitles[lang] || heatmapTitles.en,
      description: heatmapDescs[lang] || heatmapDescs.en,
      provinceColumn: detectedProvinceCol,
      valueColumn: detectedValueCol,
    };
  }

  // ---- STANDARD VISUALIZATION (AI call) ----
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
- Pick the BEST chart type for the data, not just any chart${getLanguageInstruction(naturalQuery)}`,
    userMessage: `QUERY: ${sqlQuery}

NATURAL LANGUAGE QUESTION: ${naturalQuery}

RESULT COLUMNS: ${columns.join(', ')}

SAMPLE DATA (first 20 rows):
${JSON.stringify(sampleRows, null, 2)}

TOTAL ROWS: ${resultData.length}

Recommend the best visualization for this data.`,
    responseFormat: 'json',
    temperature: 0.3,
    ...aiConfig,
  });

  if (result.parsedJson) {
    return result.parsedJson as {
      chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'heatmap';
      title: string;
      description: string;
      xAxis?: string;
      yAxis?: string[];
      colorBy?: string;
      metrics?: Array<{ label: string; value: number; format?: string }>;
      provinceColumn?: string;
      valueColumn?: string;
    };
  }

  // Fallback: try to extract visualization suggestion from plain text
  const vizFallback = extractVisualizationFromPlainText(result.content, columns);
  if (vizFallback) {
    console.info('Successfully extracted visualization suggestion from AI plain text response');
    return vizFallback;
  }

  return {
    chartType: 'table',
    title: 'Query Results',
    description: 'Data displayed in table format',
  };
}
