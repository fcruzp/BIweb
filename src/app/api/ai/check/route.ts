import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Test AI connection endpoint.
 * POST /api/ai/test
 * Body: { provider: 'z-ai' | 'openrouter', modelId?: string, apiKey?: string }
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { provider, modelId, apiKey } = body;

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required (z-ai or openrouter)' },
        { status: 400 }
      );
    }

    // ---- OpenRouter Test ----
    if (provider === 'openrouter') {
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'OpenRouter API key is required' },
          { status: 400 }
        );
      }

      const client = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://datamind.bi',
          'X-Title': 'DataMind BI',
        },
      });

      const model = modelId || 'anthropic/claude-sonnet-4';

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Respond briefly.' },
          { role: 'user', content: 'Say "Connection successful" in exactly 2 words.' },
        ],
        max_tokens: 20,
        temperature: 0,
      });

      const content = completion.choices[0]?.message?.content || '(empty)';

      return NextResponse.json({
        success: true,
        provider: 'openrouter',
        model,
        response: content,
        timing_ms: Date.now() - startTime,
      });
    }

    // ---- Z-AI Test ----
    if (provider === 'z-ai') {
      try {
        const zai = await ZAI.create();

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: 'You are a helpful assistant. Respond briefly.' },
            { role: 'user', content: 'Say "Connection successful" in exactly 2 words.' },
          ],
          thinking: { type: 'disabled' },
        });

        const content = completion.choices[0]?.message?.content || '(empty)';

        return NextResponse.json({
          success: true,
          provider: 'z-ai',
          model: 'auto',
          response: content,
          timing_ms: Date.now() - startTime,
        });
      } catch (zaiError) {
        const message = zaiError instanceof Error ? zaiError.message : String(zaiError);
        return NextResponse.json({
          success: false,
          provider: 'z-ai',
          error: `Z-AI is not available in this environment: ${message}`,
          hint: 'Switch to OpenRouter provider with your API key for production use.',
          timing_ms: Date.now() - startTime,
        }, { status: 503 });
      }
    }

    return NextResponse.json(
      { success: false, error: `Unknown provider: ${provider}` },
      { status: 400 }
    );
  } catch (error) {
    const errInfo = error instanceof Error
      ? { message: error.message, name: error.name }
      : { message: String(error) };

    console.error('[AITest] FAILED:', errInfo);

    return NextResponse.json({
      success: false,
      error: errInfo.message,
      timing_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}
