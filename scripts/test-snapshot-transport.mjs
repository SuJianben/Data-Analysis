import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { handleSnapshotRequest } from "../output/snapshot-routes-test.mjs";
import { handleAnalysisResultRequest } from "../output/analysis-result-routes-test.mjs";

const values = new Map();
const snapshotKv = {
  async put(key, value) {
    values.set(key, value instanceof ArrayBuffer ? value.slice(0) : String(value));
  },
  async get(key, type) {
    const value = values.get(key);
    if (value === undefined) return null;
    if (type === "json") return JSON.parse(String(value));
    if (type === "arrayBuffer") return value;
    return value;
  },
  async delete(key) {
    values.delete(key);
  },
};
const env = {
  SNAPSHOT_KV: snapshotKv,
  ALLOWED_ORIGINS: "https://example.com",
  READ_API_KEY: "read-key",
  SERVER_INGEST_KEY: "write-key",
};
const compressed = gzipSync(Buffer.from("sqlite-snapshot-test"));
const sha256 = createHash("sha256").update(compressed).digest("hex");

const unauthorized = await handleSnapshotRequest(new Request("https://worker.example/v1/snapshot", {
  method: "PUT",
  body: compressed,
}), env, "/v1/snapshot");
assert.equal(unauthorized.status, 401);

const uploaded = await handleSnapshotRequest(new Request("https://worker.example/v1/snapshot", {
  method: "PUT",
  headers: {
    "x-tkf-ingest-key": "write-key",
    "x-snapshot-sha256": sha256,
    "x-snapshot-original-bytes": "20",
  },
  body: compressed,
}), env, "/v1/snapshot");
assert.equal(uploaded.status, 200);
const uploadResult = await uploaded.json();
assert.equal(uploadResult.sha256, sha256);

const head = await handleSnapshotRequest(new Request("https://worker.example/v1/snapshot", {
  method: "HEAD",
  headers: { Authorization: "Bearer read-key" },
}), env, "/v1/snapshot");
assert.equal(head.status, 200);
assert.equal(head.headers.get("x-snapshot-encoding"), "gzip");
assert.equal(head.headers.get("x-snapshot-sha256"), sha256);

const downloaded = await handleSnapshotRequest(new Request("https://worker.example/v1/snapshot", {
  headers: { Authorization: "Bearer read-key" },
}), env, "/v1/snapshot");
assert.equal(downloaded.status, 200);
assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), compressed);

const unchanged = await handleSnapshotRequest(new Request("https://worker.example/v1/snapshot", {
  method: "HEAD",
  headers: {
    Authorization: "Bearer read-key",
    "If-None-Match": head.headers.get("etag"),
  },
}), env, "/v1/snapshot");
assert.equal(unchanged.status, 304);

const analysisPath = "/v1/analysis-results/tms/2026-09-18_2026-09-20";
const analysisRecord = { schemaVersion: "test", siteKey: "tms", result: { headline: "ok" } };
const savedAnalysis = await handleAnalysisResultRequest(new Request(`https://worker.example${analysisPath}`, {
  method: "PUT",
  headers: { "x-tkf-ingest-key": "write-key" },
  body: JSON.stringify(analysisRecord),
}), env, analysisPath);
assert.equal(savedAnalysis.status, 200);
const loadedAnalysis = await handleAnalysisResultRequest(new Request(`https://worker.example${analysisPath}`, {
  headers: { Authorization: "Bearer read-key" },
}), env, analysisPath);
assert.equal(loadedAnalysis.status, 200);
assert.deepEqual(await loadedAnalysis.json(), analysisRecord);
const deletedAnalysis = await handleAnalysisResultRequest(new Request(`https://worker.example${analysisPath}`, {
  method: "DELETE",
  headers: { "x-tkf-ingest-key": "write-key" },
}), env, analysisPath);
assert.equal(deletedAnalysis.status, 200);

console.log("KV 中转验证通过：快照与 AI 分析的鉴权、写入和读取均正常。");
