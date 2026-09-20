import { hasReadAccess, hasServerIngestAccess, json } from "./http";
import type { Env } from "./types";

const ANALYSIS_PATH_PATTERN = /^\/v1\/analysis-results\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/;
const MAX_ANALYSIS_BYTES = 256_000;

function analysisKey(match: RegExpMatchArray) {
  return `analysis-results/v1/${match[1]}/${match[2]}_${match[3]}.json`;
}

export async function handleAnalysisResultRequest(request: Request, env: Env, pathname: string) {
  const match = pathname.match(ANALYSIS_PATH_PATTERN);
  if (!match) return null;
  const key = analysisKey(match);
  if (request.method === "PUT") {
    if (!hasServerIngestAccess(request, env)) {
      return json(request, env, { ok: false, error: "分析结果写入凭证无效。" }, 401);
    }
    const body = await request.text();
    if (!body || new TextEncoder().encode(body).byteLength > MAX_ANALYSIS_BYTES) {
      return json(request, env, { ok: false, error: "分析结果大小不符合要求。" }, 413);
    }
    try {
      JSON.parse(body);
    } catch {
      return json(request, env, { ok: false, error: "分析结果不是有效 JSON。" }, 400);
    }
    await env.SNAPSHOT_KV.put(key, body);
    return json(request, env, { ok: true, key });
  }
  if (request.method === "GET") {
    if (!hasReadAccess(request, env)) {
      return json(request, env, { ok: false, error: "分析结果读取凭证无效。" }, 401);
    }
    const body = await env.SNAPSHOT_KV.get(key, "text");
    if (!body) return json(request, env, { ok: false, error: "分析结果不存在。" }, 404);
    return new Response(body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }
  if (request.method === "DELETE") {
    if (!hasServerIngestAccess(request, env)) {
      return json(request, env, { ok: false, error: "分析结果删除凭证无效。" }, 401);
    }
    await env.SNAPSHOT_KV.delete(key);
    return json(request, env, { ok: true, deleted: key });
  }
  return json(request, env, { ok: false, error: "请求方法不受支持。" }, 405);
}
