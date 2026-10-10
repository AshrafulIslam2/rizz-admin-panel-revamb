type Result = { success?: boolean; error?: string; [key: string]: unknown };

/** Flush progress bytes while AI works, so the reverse proxy's idle timer resets. */
export function createAiStream(request: Request, generate: (signal: AbortSignal) => Promise<Result>): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  let stop: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => { clearInterval(heartbeat); clearTimeout(deadline); request.signal.removeEventListener("abort", cancel); };
      const close = () => { if (!open) return; open = false; cleanup(); controller.close(); };
      const send = (value: unknown) => { if (open) controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`)); };
      const cancel = () => { abort.abort(); close(); };
      stop = () => { if (!open) return; open = false; abort.abort(); cleanup(); };
      if (request.signal.aborted) { cancel(); return; }
      request.signal.addEventListener("abort", cancel, { once: true });
      send({ type: "progress" });
      heartbeat = setInterval(() => send({ type: "progress" }), 10000);
      deadline = setTimeout(() => {
        send({ success: false, error: "AI took too long to respond. Please try again." });
        abort.abort(); close();
      }, 170000);
      void generate(abort.signal).then(send).catch(() => send({ success: false, error: "AI generation failed. Please try again." })).finally(close);
    },
    cancel() { stop?.(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
    "Vary": "Accept",
  } });
}
