import ZAI from 'z-ai-web-dev-sdk';

/**
 * SSE test endpoint that mimics the chat SSE pipeline.
 * Uses the same TransformStream + setTimeout pattern as the chat route.
 *
 * GET /api/chat/sse-test?prompt=Hello
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const encoder = new TextEncoder();

  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt') || 'Say "SSE test OK" in 3 words';

  function sseData(event: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  function sseComment(): Uint8Array {
    return encoder.encode(': ping\n\n');
  }

  console.log(`[SSE-Test] === START === prompt="${prompt}"`);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();

  // CRITICAL: Use setTimeout(0) so the Response is returned BEFORE any writes
  setTimeout(() => {
    const writer = writable.getWriter();

    const heartbeatInterval = setInterval(async () => {
      try {
        await writer.write(sseComment());
        await writer.write(sseData({ type: 'heartbeat', elapsed_ms: Date.now() - startTime }));
      } catch { /* writer closed */ }
    }, 2000);

    (async () => {
      try {
        // Step 1: Connected
        await writer.write(sseComment());
        await writer.write(sseData({ type: 'connected', timestamp: startTime }));
        console.log(`[SSE-Test] Connected event sent (${Date.now() - startTime}ms)`);

        // Step 2: Init Z-AI
        await writer.write(sseData({ type: 'log', step: 'zai_init', duration_ms: 0, status: 'start' }));
        const initStart = Date.now();
        const zai = await ZAI.create();
        const initTime = Date.now() - initStart;
        await writer.write(sseData({ type: 'log', step: 'zai_init', duration_ms: initTime, status: 'done', detail: 'Z-AI instance created' }));
        console.log(`[SSE-Test] Z-AI init: ${initTime}ms`);

        // Step 3: Make AI call
        await writer.write(sseData({ type: 'log', step: 'ai_call', duration_ms: 0, status: 'start', detail: 'Calling Z-AI...' }));
        await writer.write(sseData({ type: 'stage', stage: 'generating_sql', message: 'Calling AI via SSE...' }));

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

        await writer.write(sseData({ type: 'log', step: 'ai_call', duration_ms: completionTime, status: 'done', detail: `Response: "${content.slice(0, 100)}"` }));
        console.log(`[SSE-Test] AI call: ${completionTime}ms`);

        // Step 4: Send result
        await writer.write(sseData({
          type: 'complete',
          message: {
            role: 'assistant',
            content: `AI Response: ${content}\n\n⏱ Init: ${initTime}ms, AI: ${completionTime}ms, Total: ${Date.now() - startTime}ms`,
          },
          timing: { total_ms: Date.now() - startTime },
        }));

        console.log(`[SSE-Test] === END === total=${Date.now() - startTime}ms`);
      } catch (error) {
        const errInfo = error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: String(error) };
        console.error(`[SSE-Test] FAILED after ${Date.now() - startTime}ms:`, errInfo);
        try {
          await writer.write(sseData({ type: 'error', error: errInfo.message }));
        } catch { /* writer closed */ }
      } finally {
        clearInterval(heartbeatInterval);
        try { await writer.close(); } catch { /* already closed */ }
      }
    })();
  }, 0);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
