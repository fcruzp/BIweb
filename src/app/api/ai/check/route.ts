import { NextResponse } from 'next/server';
import { createCompletion } from '@/lib/ai';
import { getAIConfig } from '@/lib/ai';

/**
 * Test the server's AI connection.
 * POST /api/ai/check
 *
 * Uses the configured API key (from DB or env vars).
 * Returns success/failure with helpful error messages.
 */
export async function POST() {
  const startTime = Date.now();

  try {
    // Check if there's a key configured at all
    const config = await getAIConfig();

    if (!config.apiKey) {
      return NextResponse.json({
        success: false,
        provider: 'openrouter',
        error: 'No API key configured. An admin needs to set one in Settings.',
        hint: 'Ask an admin to configure the AI via Settings > AI Configuration.',
        configSource: 'none',
      }, { status: 503 });
    }

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
      model: config.model,
      response: content,
      timing_ms: Date.now() - startTime,
    });
  } catch (error) {
    const errInfo = error instanceof Error
      ? { message: error.message, name: error.name }
      : { message: String(error) };

    console.error('[AICheck] FAILED:', errInfo);

    // Parse common errors into user-friendly hints
    let hint = 'Ensure the API key is configured correctly.';
    if (errInfo.message.includes('401') || errInfo.message.includes('Incorrect API key')) {
      hint = 'API key is invalid or expired. An admin needs to update it in Settings.';
    } else if (errInfo.message.includes('402') || errInfo.message.includes('Insufficient credits')) {
      hint = 'API key has insufficient credits. An admin needs to top up or switch to a free model.';
    } else if (errInfo.message.includes('not configured')) {
      hint = 'No API key is set. An admin needs to configure it in Settings > AI Configuration.';
    }

    return NextResponse.json({
      success: false,
      provider: 'openrouter',
      error: errInfo.message,
      hint,
      timing_ms: Date.now() - startTime,
    }, { status: 503 });
  }
}
