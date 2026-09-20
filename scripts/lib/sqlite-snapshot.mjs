import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, copyFileSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import Database from "better-sqlite3";

const MAX_COMPRESSED_BYTES = 24 * 1024 * 1024;

function verify(databasePath) {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = database.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error(`SQLite 完整性检查失败：${String(integrity)}`);
    return database.prepare("SELECT COUNT(*) AS value FROM user_events").get().value;
  } finally {
    database.close();
  }
}

export async function createSqliteSnapshot(sourcePath, deployPath) {
  const temporaryDirectory = path.join(os.tmpdir(), "multi-site-analytics-snapshot");
  const databasePath = path.join(temporaryDirectory, `analytics-${process.pid}.db`);
  const compressedPath = `${databasePath}.gz`;
  mkdirSync(temporaryDirectory, { recursive: true });
  rmSync(databasePath, { force: true });
  rmSync(compressedPath, { force: true });
  const source = new Database(sourcePath, { fileMustExist: true });
  try {
    await source.backup(databasePath);
  } finally {
    source.close();
  }
  const userEvents = verify(databasePath);
  copyFileSync(databasePath, deployPath);
  await pipeline(createReadStream(databasePath), createGzip({ level: 9 }), createWriteStream(compressedPath));
  const compressedBytes = statSync(compressedPath).size;
  if (compressedBytes > MAX_COMPRESSED_BYTES) {
    throw new Error(`压缩快照为 ${(compressedBytes / 1024 / 1024).toFixed(2)} MiB，超过中转上限。`);
  }
  const compressed = readFileSync(compressedPath);
  return {
    databasePath,
    compressedPath,
    compressed,
    compressedBytes,
    originalBytes: statSync(databasePath).size,
    sha256: createHash("sha256").update(compressed).digest("hex"),
    userEvents,
    cleanup() {
      rmSync(databasePath, { force: true });
      rmSync(compressedPath, { force: true });
    },
  };
}

export async function publishSnapshotToWorker(snapshot, environment = process.env) {
  const apiBase = (environment.USER_EVENT_API_URL || "").replace(/\/$/, "");
  const endpoint = apiBase ? `${apiBase}/snapshot` : "";
  const uploadKey = environment.USER_EVENT_FORWARD_KEY || environment.TKF_IMPORT_KEY || environment.IMPORT_INGEST_KEY || "";
  if (!endpoint) throw new Error("缺少 USER_EVENT_API_URL，无法发布远程快照。");
  if (!uploadKey) throw new Error("缺少快照上传凭证。");
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/gzip",
      "x-tkf-ingest-key": uploadKey,
      "x-snapshot-sha256": snapshot.sha256,
      "x-snapshot-original-bytes": String(snapshot.originalBytes),
    },
    body: snapshot.compressed,
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `远程快照发布失败（HTTP ${response.status}）。`);
  }
  return payload;
}
