export async function GET() {
  const encoder = new TextEncoder();

  // Use async generator — compatible with Bun runtime
  async function* generate() {
    for (let i = 1; i <= 3; i++) {
      const event = { type: 'tick', i, message: `Event ${i}` };
      yield encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    yield encoder.encode(`data: ${JSON.stringify({ type: 'done', message: 'SSE test complete!' })}\n\n`);
  }

  const stream = ReadableStream.from(generate());

  return new Response(stream, {
    headers: {
      // Use application/x-ndjson instead of text/event-stream to avoid dev server crash
      // In production with Caddy, this won't matter — the client parses the data format
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
