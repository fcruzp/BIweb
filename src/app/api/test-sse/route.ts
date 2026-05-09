/**
 * Simple SSE test endpoint — no auth, no AI, just streaming.
 * Uses TransformStream pattern (same as chat route).
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

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  // Heartbeat every 2s
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(sseComment());
      await writer.write(sseData({ type: 'heartbeat', elapsed_ms: Date.now() - startTime }));
    } catch { /* writer closed */ }
  }, 2000);

  // Background: send 3 events with 1s delay each
  (async () => {
    try {
      await writer.write(sseComment());
      await writer.write(sseData({ type: 'connected', timestamp: startTime }));

      for (let i = 1; i <= 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await writer.write(sseData({ type: 'tick', i, message: `Event ${i}`, elapsed_ms: Date.now() - startTime }));
      }

      await writer.write(sseData({ type: 'done', message: 'SSE test complete!', total_ms: Date.now() - startTime }));
    } finally {
      clearInterval(heartbeatInterval);
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
