import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Simple test endpoint to verify the Z-AI SDK works.
 * No auth required, no SSE, just a plain JSON response.
 * GET /api/test-ai?prompt=hello
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt') || 'Say "Z-AI is working" in 5 words or less.';

  const startTime = Date.now();
  console.log(`[TestAI] === START === prompt="${prompt}"`);

  try {
    // Step 1: Create Z-AI instance
    const initStart = Date.now();
    const zai = await ZAI.create();
    console.log(`[TestAI] Z-AI instance created (${Date.now() - initStart}ms)`);

    // Step 2: Make a simple completion
    const completionStart = Date.now();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'You are a helpful assistant. Respond briefly.' },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    });
    const completionTime = Date.now() - completionStart;

    const content = completion.choices[0]?.message?.content || '(empty)';
    console.log(`[TestAI] Completion received (${completionTime}ms): "${content.slice(0, 200)}"`);

    return NextResponse.json({
      success: true,
      prompt,
      response: content,
      timing: {
        init_ms: Date.now() - initStart,
        completion_ms: completionTime,
        total_ms: Date.now() - startTime,
      },
      raw_usage: completion.usage || null,
    });
  } catch (error) {
    const errInfo = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack?.slice(0, 500) }
      : { message: String(error) };
    console.error(`[TestAI] FAILED after ${Date.now() - startTime}ms:`, errInfo);

    return NextResponse.json({
      success: false,
      prompt,
      error: errInfo,
      timing: {
        total_ms: Date.now() - startTime,
      },
    }, { status: 500 });
  }
}
