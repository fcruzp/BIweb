import ZAI from 'z-ai-web-dev-sdk';

/**
 * SSE test endpoint that mimics the chat SSE pipeline.
 * Uses the same ReadableStream + controller.enqueue() pattern.
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

  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let isClosed = false;

  function send(event: Record<string, unknown>): void {
    if (isClosed || !controller) return;
    try {
      controller.enqueue(sseData(event));
    } catch {
      isClosed = true;
    }
  }

  function sendFlush(): void {
    if (isClosed || !controller) return;
    try {
      controller.enqueue(sseComment());
    } catch {
      isClosed = true;
    }
  }

  console.log(`[SSE-Test] === START === prompt="${prompt}"`);

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      // Send connected event SYNCHRONOUSLY in start()
      ctrl.enqueue(sseComment());
      ctrl.enqueue(sseData({ type: 'connected', timestamp: startTime }));
      console.log(`[SSE-Test] Connected event enqueued in start()`);
    },
    cancel() {
      isClosed = true;
    },
  });

  // Heartbeat every 2s
  const heartbeatInterval = setInterval(() => {
    if (isClosed) return;
    sendFlush();
    send({ type: 'heartbeat', elapsed_ms: Date.now() - startTime });
  }, 2000);

  // Background processing via setTimeout (macrotask)
  setTimeout(() => {
    (async () => {
      try {
        // Step 2: Init Z-AI
        send({ type: 'log', step: 'zai_init', duration_ms: 0, status: 'start' });
        sendFlush();
        const initStart = Date.now();
        const zai = await ZAI.create();
        const initTime = Date.now() - initStart;
        send({ type: 'log', step: 'zai_init', duration_ms: initTime, status: 'done', detail: 'Z-AI instance created' });
        console.log(`[SSE-Test] Z-AI init: ${initTime}ms`);

        // Step 3: Make AI call
        send({ type: 'log', step: 'ai_call', duration_ms: 0, status: 'start', detail: 'Calling Z-AI...' });
        send({ type: 'stage', stage: 'generating_sql', message: 'Calling AI via SSE...' });
        sendFlush();

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

        send({ type: 'log', step: 'ai_call', duration_ms: completionTime, status: 'done', detail: `Response: "${content.slice(0, 100)}"` });
        console.log(`[SSE-Test] AI call: ${completionTime}ms`);

        // Step 4: Send result
        send({
          type: 'complete',
          message: {
            role: 'assistant',
            content: `AI Response: ${content}\n\n⏱ Init: ${initTime}ms, AI: ${completionTime}ms, Total: ${Date.now() - startTime}ms`,
          },
          timing: { total_ms: Date.now() - startTime },
        });

        console.log(`[SSE-Test] === END === total=${Date.now() - startTime}ms`);
      } catch (error) {
        const errInfo = error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: String(error) };
        console.error(`[SSE-Test] FAILED after ${Date.now() - startTime}ms:`, errInfo);
        send({ type: 'error', error: errInfo.message });
      } finally {
        clearInterval(heartbeatInterval);
        isClosed = true;
        try { controller?.close(); } catch { /* already closed */ }
      }
    })();
  }, 0);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
