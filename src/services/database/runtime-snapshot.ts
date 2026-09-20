import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { activateDatabasePath } from "@/services/database/db";
import { describeRemoteSnapshot, downloadRemoteSnapshot } from "@/services/database/remote-snapshot";

const RUNTIME_DIRECTORY = path.join("/tmp", "multi-site-analytics");
const FRESHNESS_WINDOW_MS = 30_000;

let lastCheckedAt = 0;
let refreshPromise: Promise<boolean> | null = null;
let lastFailureMessage = "";

function verifyDatabase(databasePath: string) {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const result = database.pragma("integrity_check", { simple: true });
    if (result !== "ok") throw new Error(`SQLite 完整性检查失败：${String(result)}`);
  } finally {
    database.close();
  }
}

async function refreshRuntimeSnapshot(force = false) {
  if (!process.env.VERCEL) return false;
  if (!force && Date.now() - lastCheckedAt < FRESHNESS_WINDOW_MS) return false;
  lastCheckedAt = Date.now();
  mkdirSync(RUNTIME_DIRECTORY, { recursive: true });
  const descriptor = await describeRemoteSnapshot();
  if (!descriptor) return false;
  const version = descriptor.version.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "latest";
  const target = path.join(RUNTIME_DIRECTORY, `analytics-${version}.db`);
  if (process.env.ANALYTICS_DATABASE_PATH === target && existsSync(target)) return false;
  if (!existsSync(target)) {
    const temporary = `${target}.${process.pid}.tmp`;
    try {
      await downloadRemoteSnapshot(descriptor, temporary);
      verifyDatabase(temporary);
      renameSync(temporary, target);
    } finally {
      if (existsSync(temporary)) rmSync(temporary, { force: true });
    }
  }
  return activateDatabasePath(target);
}

export async function ensureRuntimeSnapshotFresh(force = false) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshRuntimeSnapshot(force)
    .then((changed) => {
      lastFailureMessage = "";
      return changed;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== lastFailureMessage) console.error("analytics_snapshot_refresh_failed", message);
      lastFailureMessage = message;
      return false;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function prepareRuntimeSnapshot() {
  await ensureRuntimeSnapshotFresh(true);
}
