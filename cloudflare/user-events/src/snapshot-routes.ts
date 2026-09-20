import { hasReadAccess, hasServerIngestAccess, json } from "./http";
import type { Env } from "./types";

const SNAPSHOT_PATH = "/v1/snapshot";
const SNAPSHOT_DATA_KEY = "analytics/current.db.gz";
const SNAPSHOT_METADATA_KEY = "analytics/current.meta.json";
const MAX_SNAPSHOT_BYTES = 24 * 1024 * 1024;

type SnapshotMetadata = {
  version: string;
  sha256: string;
  compressedBytes: number;
  originalBytes: number;
  uploadedAt: string;
};

function snapshotHeaders(metadata: SnapshotMetadata) {
  return {
    "Cache-Control": "private, no-store",
    "Content-Type": "application/gzip",
    "Content-Length": String(metadata.compressedBytes),
    "ETag": `"${metadata.version}"`,
    "Last-Modified": new Date(metadata.uploadedAt).toUTCString(),
    "X-Snapshot-Encoding": "gzip",
    "X-Snapshot-Original-Bytes": String(metadata.originalBytes),
    "X-Snapshot-Sha256": metadata.sha256,
  };
}

async function sha256Hex(value: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readMetadata(env: Env) {
  const value = await env.SNAPSHOT_KV.get(SNAPSHOT_METADATA_KEY, "json");
  if (!value || typeof value !== "object") return null;
  const metadata = value as Partial<SnapshotMetadata>;
  if (!metadata.version || !metadata.sha256 || !metadata.compressedBytes || !metadata.uploadedAt) return null;
  return metadata as SnapshotMetadata;
}

async function uploadSnapshot(request: Request, env: Env) {
  if (!hasServerIngestAccess(request, env)) {
    return json(request, env, { ok: false, error: "快照上传凭证无效。" }, 401);
  }
  const compressed = await request.arrayBuffer();
  if (!compressed.byteLength || compressed.byteLength > MAX_SNAPSHOT_BYTES) {
    return json(request, env, { ok: false, error: "压缩快照大小不符合要求。" }, 413);
  }
  const expectedSha256 = (request.headers.get("x-snapshot-sha256") || "").toLowerCase();
  const actualSha256 = await sha256Hex(compressed);
  if (!/^[a-f0-9]{64}$/.test(expectedSha256) || expectedSha256 !== actualSha256) {
    return json(request, env, { ok: false, error: "快照校验值不匹配。" }, 400);
  }
  const originalBytes = Number(request.headers.get("x-snapshot-original-bytes") || 0);
  const metadata: SnapshotMetadata = {
    version: actualSha256.slice(0, 32),
    sha256: actualSha256,
    compressedBytes: compressed.byteLength,
    originalBytes: Number.isFinite(originalBytes) && originalBytes > 0 ? originalBytes : 0,
    uploadedAt: new Date().toISOString(),
  };
  await env.SNAPSHOT_KV.put(SNAPSHOT_DATA_KEY, compressed);
  await env.SNAPSHOT_KV.put(SNAPSHOT_METADATA_KEY, JSON.stringify(metadata));
  return json(request, env, { ok: true, ...metadata });
}

async function downloadSnapshot(request: Request, env: Env) {
  if (!hasReadAccess(request, env)) {
    return json(request, env, { ok: false, error: "快照读取凭证无效。" }, 401);
  }
  const metadata = await readMetadata(env);
  if (!metadata) return json(request, env, { ok: false, error: "快照尚未发布。" }, 404);
  const headers = snapshotHeaders(metadata);
  if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  const data = await env.SNAPSHOT_KV.get(SNAPSHOT_DATA_KEY, "arrayBuffer");
  if (!data) return json(request, env, { ok: false, error: "快照文件不存在。" }, 404);
  return new Response(data, { status: 200, headers });
}

export async function handleSnapshotRequest(request: Request, env: Env, pathname: string) {
  if (pathname !== SNAPSHOT_PATH) return null;
  if (request.method === "PUT") return uploadSnapshot(request, env);
  if (request.method === "GET" || request.method === "HEAD") return downloadSnapshot(request, env);
  return json(request, env, { ok: false, error: "请求方法不受支持。" }, 405);
}
