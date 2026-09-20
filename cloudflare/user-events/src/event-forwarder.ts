import { corsHeaders } from "./http";
import type { Env, UserEventPayload } from "./types";

function responseHeaders(request: Request, env: Env, upstream: Response) {
  const headers = new Headers(corsHeaders(request, env));
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json; charset=utf-8");
  headers.set("X-Signal-Storage", "vercel-queue");
  const retryAfter = upstream.headers.get("Retry-After");
  if (retryAfter) headers.set("Retry-After", retryAfter);
  return headers;
}

export async function forwardUserEventPayload(request: Request, env: Env, payload: UserEventPayload) {
  const origin = request.headers.get("Origin");
  const userAgent = request.headers.get("User-Agent");
  const headers = new Headers({ "Content-Type": "text/plain;charset=UTF-8" });
  if (origin) headers.set("Origin", origin);
  if (userAgent) headers.set("User-Agent", userAgent);

  const upstream = await fetch(env.EVENT_FORWARD_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: responseHeaders(request, env, upstream),
  });
}
