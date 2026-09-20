#!/usr/bin/env node

import { closeSync, existsSync, openSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnvironment } from "./lib/load-env.mjs";

loadEnvironment();

const projectRoot = process.cwd();
const lockPath = path.join(projectRoot, "logs", "multi-site-local-sync.lock");
const eventsOnly = process.argv.includes("--events-only");
const skipEvents = process.argv.includes("--skip-events");

function acquireLock() {
  if (existsSync(lockPath) && Date.now() - statSync(lockPath).mtimeMs > 30 * 60 * 1_000) rmSync(lockPath, { force: true });
  try { return openSync(lockPath, "wx"); } catch { console.log("[自动同步] 上一次任务仍在运行，本次跳过。"); return null; }
}

function run(script, args = [], retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", script), ...args], { cwd: projectRoot, env: process.env, stdio: "inherit", timeout: 10 * 60 * 1_000 });
    if (result.status === 0) return true;
    if (attempt < retries) console.warn(`[自动同步] ${script} 第 ${attempt + 1} 次执行失败，立即补跑一次。`);
  }
  return false;
}

const lock = acquireLock();
if (lock === null) process.exit(0);
let failed = false;
let eventInsertions = 0;
let priorityInsertions = 0;
let snapshotPublished = false;
try {
  if (!skipEvents) {
    const resultPath = path.join(projectRoot, "logs", `event-drain-${process.pid}.json`);
    rmSync(resultPath, { force: true });
    if (!run("drain-vercel-events.mjs", ["--result-file", resultPath], 1)) failed = true;
    else if (existsSync(resultPath)) {
      const result = JSON.parse(readFileSync(resultPath, "utf8"));
      eventInsertions = Number(result.inserted || 0);
      priorityInsertions = Number(result.priorityInsertions || 0);
    }
    rmSync(resultPath, { force: true });
  }
  if (!eventsOnly) {
    for (const site of ["tkf", "tms", "fkk", "blk", "dtk"]) {
      if (!run("sync-ga4-to-local.mjs", ["--site", site], 1)) failed = true;
    }
  }
  if (!eventsOnly || priorityInsertions > 0) {
    if (!run("publish-local-snapshot.mjs", [], 1)) failed = true;
    else snapshotPublished = true;
  } else if (eventInsertions > 0) {
    console.log(`[自动同步] 本地新增 ${eventInsertions} 条普通事件，将在下一次完整同步时合并发布。`);
  } else {
    console.log("[自动同步] 队列没有新增事件，本次无需发布重复快照。");
  }
} finally {
  closeSync(lock);
  rmSync(lockPath, { force: true });
}
if (failed) process.exitCode = 1;
else if (snapshotPublished) console.log("[自动同步] 本地主库与 Vercel 展示快照已更新。");
else console.log("[自动同步] 队列检查完成，本地数据没有变化。");
