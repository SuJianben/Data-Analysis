import { corsHeaders, hasReadAccess, hasServerIngestAccess, isBrowserOriginAllowed, json } from "./http";
import { handleAnalyticsRequest } from "./analytics-routes";
import { getUserDeviceBreakdown, getUserEvents, getUserSummaryReport, getUserTrend } from "./repository";
import type { Env } from "./types";
import { parseIdentityKey, parseUserEventPayload } from "./validation";
import { parseDateRange } from "./date-range";
import { isOpaqueShopifyPixelRequest } from "./shopify-pixel-ingest";
import { isOpaqueShoplineEventRequest } from "./shopline-pixel-ingest";
import { browserPayloadMatchesSite } from "./sites";
import { forwardUserEventPayload } from "./event-forwarder";
import { handleSnapshotRequest } from "./snapshot-routes";
import { handleAnalysisResultRequest } from "./analysis-result-routes";

const MAX_BODY_BYTES = 256_000;

async function ingest(request: Request, env: Env) {
  const hasServerAccess = hasServerIngestAccess(request, env);
  const hasBrowserAccess = isBrowserOriginAllowed(request, env);
  const hasStandardAccess = hasBrowserAccess || hasServerAccess;
  if (!hasStandardAccess && request.headers.get("Origin") !== "null") {
    return json(request, env, { ok: false, error: "该来源不允许提交用户事件。" }, 403);
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return json(request, env, { ok: false, error: "用户事件请求体过大。" }, 413);
  }
  try {
    const payload = parseUserEventPayload(JSON.parse(body));
    if (hasBrowserAccess && !hasServerAccess && !browserPayloadMatchesSite(env.SERVICE_NAME, request.headers.get("Origin"), payload.siteKey)) {
      return json(request, env, { ok: false, error: "来源域名、站点与接收入口不匹配。" }, 403);
    }
    if (!hasStandardAccess && !isOpaqueShopifyPixelRequest(request, payload) && !isOpaqueShoplineEventRequest(request, payload)) {
      return json(request, env, { ok: false, error: "该隔离像素来源只允许提交经过校验的站点事件。" }, 403);
    }
    try {
      return await forwardUserEventPayload(request, env, payload);
    } catch (error) {
      console.error("signal_ingest_forward_failure", {
        service: env.SERVICE_NAME,
        siteKey: payload.siteKey,
        source: payload.source,
        eventNames: [...new Set(payload.events.map((event) => event.eventName))],
        eventCount: payload.events.length,
        rayId: request.headers.get("cf-ray") || "",
        error: error instanceof Error ? error.message : String(error),
      });
      return Response.json({
        ok: false,
        code: "forward_temporarily_unavailable",
        error: "事件转发暂时不可用，请稍后重试。",
        retryable: true,
        received: payload.events.length,
        accepted: payload.events.length,
      }, {
        status: 503,
        headers: { ...corsHeaders(request, env), "Retry-After": "60" },
      });
    }
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
  const pageValue = Number(url.searchParams.get("page") || 1);
  const pageSizeValue = Number(url.searchParams.get("pageSize") || url.searchParams.get("limit") || 20);
  const page = Number.isFinite(pageValue) ? Math.max(Math.floor(pageValue), 1) : 1;
  const pageSize = Number.isFinite(pageSizeValue) ? Math.min(Math.max(Math.floor(pageSizeValue), 1), 500) : 20;
  try {
    return json(request, env, { ok: true, ...(await getUserSummaryReport(env, { ...parseDateRange(url), page, pageSize })) });
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
      return json(request, env, {
        ok: true,
        service: env.SERVICE_NAME,
        storage: "vercel-queue-proxy",
        eventForwardUrl: env.EVENT_FORWARD_URL,
        schemaVersion: "2026-09-18.vercel-queue-proxy-v1",
      });
    }
    const snapshotResponse = await handleSnapshotRequest(request, env, url.pathname);
    if (snapshotResponse) return snapshotResponse;
    const analysisResultResponse = await handleAnalysisResultRequest(request, env, url.pathname);
    if (analysisResultResponse) return analysisResultResponse;
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
