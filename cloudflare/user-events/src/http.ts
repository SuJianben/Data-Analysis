import type { Env } from "./types";

export function allowedOrigins(env: Env) {
  return env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
}

export function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins(env);
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, content-type, x-tkf-ingest-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function json(request: Request, env: Env, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request, env) });
}

export function isBrowserOriginAllowed(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && allowedOrigins(env).includes(origin));
}

export function hasReadAccess(request: Request, env: Env) {
  const authorization = request.headers.get("Authorization");
  return Boolean(env.READ_API_KEY && authorization === `Bearer ${env.READ_API_KEY}`);
}

export function hasServerIngestAccess(request: Request, env: Env) {
  return Boolean(env.SERVER_INGEST_KEY && request.headers.get("x-tkf-ingest-key") === env.SERVER_INGEST_KEY);
}
