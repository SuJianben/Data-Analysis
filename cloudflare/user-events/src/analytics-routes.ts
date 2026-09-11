import { hasReadAccess, hasServerIngestAccess, json } from "./http";
import {
  getAnalyticsDataset,
  getAnalyticsOverview,
  getGlobalClickTrend,
  getGlobalClickReport,
  getGlobalClickSummary,
  getMenuTrend,
  getMenuReportRows,
  importAnalyticsDataset,
} from "./analytics-repository";
import { parseAnalyticsImportPayload } from "./analytics-validation";
import { parseDateRange } from "./date-range";
import { parseGlobalClickQuery } from "./global-click-query";
import { getDataHealthReport } from "./health-repository";
import type { Env } from "./types";

const MAX_BODY_BYTES = 1_500_000;

async function importAnalytics(request: Request, env: Env) {
  if (!hasServerIngestAccess(request, env)) {
    return json(request, env, { ok: false, error: "报表导入凭证无效。" }, 401);
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return json(request, env, { ok: false, error: "报表导入请求体过大。" }, 413);
  }
  try {
    const payload = parseAnalyticsImportPayload(JSON.parse(body));
    return json(request, env, { ok: true, ...(await importAnalyticsDataset(env, payload)) });
  } catch (error) {
    return json(request, env, {
      ok: false,
      error: error instanceof Error ? error.message : "报表导入格式不正确。",
    }, 400);
  }
}

function requireReadAccess(request: Request, env: Env) {
  return hasReadAccess(request, env)
    ? null
    : json(request, env, { ok: false, error: "读取凭证无效。" }, 401);
}

export async function handleAnalyticsRequest(request: Request, env: Env, path: string): Promise<Response | null> {
  if (request.method === "POST" && path === "/v1/analytics/import") {
    return importAnalytics(request, env);
  }
  if (request.method !== "GET" || !path.startsWith("/v1/analytics/")) return null;
  const denied = requireReadAccess(request, env);
  if (denied) return denied;
  const url = new URL(request.url);
  if (path === "/v1/analytics/health") {
    return json(request, env, { ok: true, report: await getDataHealthReport(env) });
  }
  let range;
  try {
    range = parseDateRange(url);
  } catch (error) {
    return json(request, env, { ok: false, error: error instanceof Error ? error.message : "时间范围不正确。" }, 400);
  }

  if (path === "/v1/analytics/overview") {
    return json(request, env, { ok: true, ...(await getAnalyticsOverview(env, range)) });
  }
  if (path === "/v1/analytics/menus") {
    return json(request, env, { ok: true, rows: await getMenuReportRows(env, range) });
  }
  if (path === "/v1/analytics/menu-trend") {
    return json(request, env, { ok: true, trend: await getMenuTrend(env, range) });
  }
  if (path === "/v1/analytics/global-clicks") {
    return json(request, env, {
      ok: true,
      ...(await getGlobalClickReport(env, parseGlobalClickQuery(url, range))),
    });
  }
  if (path === "/v1/analytics/global-click-summary") {
    return json(request, env, { ok: true, summary: await getGlobalClickSummary(env, range) });
  }
  if (path === "/v1/analytics/global-click-trend") {
    return json(request, env, { ok: true, trend: await getGlobalClickTrend(env, range) });
  }
  if (path === "/v1/analytics/dataset") {
    return json(request, env, { ok: true, dataset: await getAnalyticsDataset(env, range) });
  }
  return null;
}
