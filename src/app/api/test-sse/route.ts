/**
 * Simple SSE test endpoint — no auth, no AI, just streaming.
 * Uses ReadableStream + controller.enqueue() (same as chat route).
 *
 * GET /api/test-sse
 */
export async function GET() {
  const startTime = Date.now();
  const encoder = new TextEncoder();

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
    try { controller.enqueue(sseData(event)); } catch { isClosed = true; }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      ctrl.enqueue(sseComment());
      ctrl.enqueue(sseData({ type: 'connected', timestamp: startTime }));
    },
    cancel() { isClosed = true; },
  });

  // Heartbeat every 2s
  const heartbeatInterval = setInterval(() => {
    send({ type: 'heartbeat', elapsed_ms: Date.now() - startTime });
  }, 2000);

  // Background: send 3 events with 1s delay each
  setTimeout(() => {
    (async () => {
      try {
        for (let i = 1; i <= 3; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          send({ type: 'tick', i, message: `Event ${i}`, elapsed_ms: Date.now() - startTime });
        }
        send({ type: 'done', message: 'SSE test complete!', total_ms: Date.now() - startTime });
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
