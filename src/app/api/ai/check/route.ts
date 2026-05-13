import { NextResponse } from 'next/server';
import { createCompletion } from '@/lib/ai';

/**
 * Test the server's OpenRouter AI connection.
 * POST /api/ai/check
 *
 * No request body needed — uses the server's OPENROUTER_API_KEY and
 * AI_DEFAULT_MODEL env vars. Just does a simple test completion call
 * and returns success/failure.
 */
export async function POST() {
  const startTime = Date.now();

  try {
    const result = await createCompletion({
      systemPrompt: 'You are a helpful assistant. Respond briefly.',
      userMessage: 'Say "Connection successful" in exactly 2 words.',
      temperature: 0,
      maxTokens: 20,
    });

    const content = result.content || '(empty)';

    return NextResponse.json({
      success: true,
      provider: 'openrouter',
      response: content,
      timing_ms: Date.now() - startTime,
    });
  } catch (error) {
    const errInfo = error instanceof Error
      ? { message: error.message, name: error.name }
      : { message: String(error) };

    console.error('[AICheck] FAILED:', errInfo);

    return NextResponse.json({
      success: false,
      provider: 'openrouter',
      error: errInfo.message,
      hint: 'Ensure OPENROUTER_API_KEY is set in your .env file.',
      timing_ms: Date.now() - startTime,
    }, { status: 503 });
  }
}
