/** Read JSON or the AI endpoint's heartbeat stream without parsing HTML errors. */
export async function readApiResponse<T = any>(response: Response, onProgress?: () => void): Promise<T> {
  if (response.status === 401 || (response.redirected && new URL(response.url).pathname === "/login")) {
    throw new Error("Your admin session has expired. Please sign in again.");
  }
  const unavailable = () => {
    if (response.status === 504 || response.status === 408) return "The server timed out waiting for AI. Please try again; if it continues, check the admin proxy timeout.";
    if (response.status === 502 || response.status === 503) return "The admin AI service is temporarily unavailable. Please try again.";
    if (response.status === 404) return "The AI endpoint is missing. Deploy the latest admin build.";
    return `The server returned an unexpected response (HTTP ${response.status}). Check the admin server logs.`;
  };
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/x-ndjson") && response.ok && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let result: T | undefined;
    const consume = (line: string) => {
      if (!line.trim()) return;
      let value;
      try { value = JSON.parse(line); } catch { throw new Error("The AI response was interrupted. Please try again."); }
      if (value?.type === "progress") onProgress?.();
      else if (value && typeof value === "object" && ("success" in value || "error" in value)) result = value;
    };
    try {
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        let end;
        while ((end = pending.indexOf("\n")) >= 0) { consume(pending.slice(0, end)); pending = pending.slice(end + 1); }
        if (done) break;
      }
      consume(pending);
    } finally { reader.releaseLock(); }
    if (!result) throw new Error("The AI connection ended before a result arrived. Please try again.");
    return result;
  }
  if (!type.includes("application/json") && !type.includes("+json")) throw new Error(unavailable());
  let data;
  try { data = await response.json(); } catch { throw new Error("The server returned incomplete JSON. Please try again."); }
  if (!response.ok) throw new Error(data?.error || data?.message || unavailable());
  return data as T;
}
