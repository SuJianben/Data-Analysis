#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvironment } from "./lib/load-env.mjs";
import { createSqliteSnapshot, publishSnapshotToWorker } from "./lib/sqlite-snapshot.mjs";

loadEnvironment();

const projectRoot = process.cwd();
const sourcePath = path.resolve(process.env.ANALYTICS_DATABASE_PATH || process.env.TKF_DATABASE_PATH || path.join(projectRoot, "data", "analytics.db"));
const deployPath = path.join(projectRoot, "data", "analytics-deploy.db");
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!existsSync(sourcePath)) throw new Error(`找不到本地主数据库：${sourcePath}`);
  const snapshot = await createSqliteSnapshot(sourcePath, deployPath);
  try {
    if (dryRun) {
      console.log(`[快照预检] 用户事件 ${snapshot.userEvents} 条，原始 ${(snapshot.originalBytes / 1024 / 1024).toFixed(2)} MiB，压缩 ${(snapshot.compressedBytes / 1024 / 1024).toFixed(2)} MiB。`);
      return;
    }
    const result = await publishSnapshotToWorker(snapshot);
    console.log(`[快照发布] Cloudflare KV，用户事件 ${snapshot.userEvents} 条，版本=${result.version}`);
  } finally {
    snapshot.cleanup();
  }
}

main().catch((error) => {
  console.error(`[快照发布失败] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
