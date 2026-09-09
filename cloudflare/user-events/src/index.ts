import { corsHeaders, hasReadAccess, hasServerIngestAccess, isBrowserOriginAllowed, json } from "./http";
import { handleAnalyticsRequest } from "./analytics-routes";
import { getUserDeviceBreakdown, getUserEvents, getUserSummaries, getUserTrend, saveEvents } from "./repository";
import type { Env } from "./types";
import { parseIdentityKey, parseUserEventPayload } from "./validation";
import { parseDateRange } from "./date-range";

const MAX_BODY_BYTES = 256_000;

async function ingest(request: Request, env: Env) {
  if (!isBrowserOriginAllowed(request, env) && !hasServerIngestAccess(request, env)) {
    return json(request, env, { ok: false, error: "该来源不允许提交用户事件。" }, 403);
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return json(request, env, { ok: false, error: "用户事件请求体过大。" }, 413);
  }
  try {
    const payload = parseUserEventPayload(JSON.parse(body));
    const inserted = await saveEvents(env, payload.source, payload.events);
    return json(request, env, { ok: true, received: payload.events.length, inserted });
  } catch (error) {
    return json(request, env, {
      ok: false,
      error: error instanceof Error ? error.message : "用户事件格式不正确。",
    }, 400);
  }
}

async function listUsers(request: Request, env: Env) {
  if (!hasReadAccess(request, env)) return json(request, env, { ok: false, error: "读取凭证无效。" }, 401);
  const url = new URL(request.url);
  const value = Number(url.searchParams.get("limit") || 200);
  const limit = Number.isFinite(value) ? Math.min(Math.max(Math.floor(value), 1), 500) : 200;
  try {
    return json(request, env, { ok: true, rows: await getUserSummaries(env, limit, parseDateRange(url)) });
  } catch (error) {
    return json(request, env, { ok: false, error: error instanceof Error ? error.message : "时间范围不正确。" }, 400);
  }
}

async function userTrend(request: Request, env: Env) {
  if (!hasReadAccess(request, env)) return json(request, env, { ok: false, error: "读取凭证无效。" }, 401);
  try {
    return json(request, env, { ok: true, trend: await getUserTrend(env, parseDateRange(new URL(request.url))) });
  } catch (error) {
    return json(request, env, { ok: false, error: error instanceof Error ? error.message : "时间范围不正确。" }, 400);
  }
}

async function userDeviceBreakdown(request: Request, env: Env) {
  if (!hasReadAccess(request, env)) return json(request, env, { ok: false, error: "读取凭证无效。" }, 401);
  try {
    return json(request, env, { ok: true, devices: await getUserDeviceBreakdown(env, parseDateRange(new URL(request.url))) });
  } catch (error) {
    return json(request, env, { ok: false, error: error instanceof Error ? error.message : "时间范围不正确。" }, 400);
  }
}

async function userDetail(request: Request, env: Env, rawIdentityKey: string) {
  if (!hasReadAccess(request, env)) return json(request, env, { ok: false, error: "读取凭证无效。" }, 401);
  const identity = parseIdentityKey(rawIdentityKey);
  if (!identity) return json(request, env, { ok: false, error: "用户标识无效。" }, 400);
  try {
    return json(request, env, { ok: true, identity, events: await getUserEvents(env, identity.key, 500, parseDateRange(new URL(request.url))) });
  } catch (error) {
    return json(request, env, { ok: false, error: error instanceof Error ? error.message : "时间范围不正确。" }, 400);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      if (!isBrowserOriginAllowed(request, env)) return new Response(null, { status: 403, headers: corsHeaders(request, env) });
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json(request, env, { ok: true, service: "tkf-signal-user-events", storage: "cloudflare-d1" });
    }
    const analyticsResponse = await handleAnalyticsRequest(request, env, url.pathname);
    if (analyticsResponse) return analyticsResponse;
    if (request.method === "POST" && url.pathname === "/v1/events") return ingest(request, env);
    if (request.method === "GET" && url.pathname === "/v1/users/trend") return userTrend(request, env);
    if (request.method === "GET" && url.pathname === "/v1/users/device-breakdown") return userDeviceBreakdown(request, env);
    if (request.method === "GET" && url.pathname === "/v1/users") return listUsers(request, env);
    if (request.method === "GET" && url.pathname.startsWith("/v1/users/")) {
      return userDetail(request, env, url.pathname.slice("/v1/users/".length));
    }
    return json(request, env, { ok: false, error: "接口不存在。" }, 404);
  },
};
