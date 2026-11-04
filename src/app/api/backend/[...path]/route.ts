import { NextRequest, NextResponse } from "next/server";
import { ADMIN_KEY_HEADER, adminKey, backendUrl } from "@/lib/backend.server";

/**
 * Authenticated proxy: browser → /api/backend/<path> → backend /<path>.
 *
 * src/proxy.ts already rejects any /api/* request without a valid admin
 * session, so by the time a request reaches here the user is logged in. This
 * handler adds the secret admin key and forwards the call. Cookies and other
 * browser headers are deliberately not passed on.
 */

const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "accept-language"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control"];

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(req: NextRequest, ctx: Ctx): Promise<Response> {
  const key = adminKey();
  if (!key) {
    return NextResponse.json(
      { message: "ADMIN_API_KEY is not configured on the admin panel server." },
      { status: 500 },
    );
  }

  const { path } = await ctx.params;
  if (!path?.length || path.some((seg) => seg === "." || seg === "..")) {
    return NextResponse.json({ message: "Invalid path." }, { status: 400 });
  }

  const target = `${backendUrl()}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set(ADMIN_KEY_HEADER, key);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json({ message: "Backend is unreachable." }, { status: 502 });
  }

  const outHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) outHeaders.set(name, value);
  }
  const noBody = upstream.status === 204 || upstream.status === 304 || req.method === "HEAD";
  return new NextResponse(noBody ? null : upstream.body, { status: upstream.status, headers: outHeaders });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
