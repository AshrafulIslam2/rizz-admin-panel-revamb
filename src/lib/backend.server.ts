/**
 * Server-only access to the NestJS backend.
 *
 * Only import this from server components and route handlers. ADMIN_API_KEY has
 * no NEXT_PUBLIC_ prefix, so it is never bundled for the browser — if this file
 * were imported client-side the key would simply be undefined.
 */

export const ADMIN_KEY_HEADER = "x-admin-key";

/** Backend base URL, e.g. https://api.rizzleather.com/api (no trailing slash). */
export function backendUrl(): string {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3040/api";
  return url.replace(/\/+$/, "");
}

export function adminKey(): string | undefined {
  return process.env.ADMIN_API_KEY || undefined;
}

/** fetch() against the backend with the admin key attached. `path` starts with "/". */
export function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const key = adminKey();
  if (key) headers.set(ADMIN_KEY_HEADER, key);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${backendUrl()}${suffix}`, { ...init, headers });
}
