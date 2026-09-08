#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function loadLocalEnv() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().replace(/^export\s+/, "");
    if (process.env[key]) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnv();

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultPeriod() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 2);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

async function fetchJson(url, init = {}, timeoutMs = 60_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`接口返回的不是 JSON（HTTP ${response.status}）`);
    }
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || `请求失败（HTTP ${response.status}）`);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`请求超时（${timeoutMs / 1000} 秒）：${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function requireEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`缺少环境变量 ${names.join(" 或 ")}`);
}

function validateDate(value, optionName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${optionName} 必须是 YYYY-MM-DD 格式`);
  }
}

async function main() {
  const fallbackPeriod = defaultPeriod();
  const period = {
    startDate: option("--start-date") || fallbackPeriod.startDate,
    endDate: option("--end-date") || fallbackPeriod.endDate,
  };
  validateDate(period.startDate, "--start-date");
  validateDate(period.endDate, "--end-date");
  if (period.startDate > period.endDate) throw new Error("开始日期不能晚于结束日期");

  const localSyncUrl = process.env.LOCAL_SYNC_URL?.trim() || "http://localhost:3000/api/sync/ga4";
  const importUrl = requireEnv("TKF_ANALYTICS_IMPORT_URL", "TKF_IMPORT_URL");
  const importKey = requireEnv("TKF_ANALYTICS_IMPORT_KEY", "TKF_IMPORT_KEY");
  const propertyId = process.env.GA4_PROPERTY_ID?.trim() || "546810508";

  console.log(`[GA4] 同步日期：${period.startDate} 至 ${period.endDate}`);
  console.log(`[GA4] 请求本机同步接口：${localSyncUrl}`);

  const localResult = await fetchJson(localSyncUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId, startDate: period.startDate, endDate: period.endDate }),
  });

  const payload = {
    source: "ga4",
    period: { start: period.startDate, end: period.endDate },
    menuMetrics: localResult.menuMetrics || [],
    siteMetrics: localResult.siteMetrics || [],
    globalClickMetrics: localResult.globalClickMetrics || [],
    metadata: {
      syncMethod: "codex-local-automation",
      localSyncId: localResult.syncId ?? null,
      warnings: localResult.warnings || [],
    },
  };

  const rowCount = payload.menuMetrics.length + payload.siteMetrics.length + payload.globalClickMetrics.length;
  console.log(`[GA4] 本机同步完成：${rowCount} 行，开始上传 Cloudflare D1`);

  const importResult = await fetchJson(importUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tkf-ingest-key": importKey,
    },
    body: JSON.stringify(payload),
  });

  console.log(`[Cloudflare] 导入完成：${importResult.rowCount ?? rowCount} 行，syncId=${importResult.syncId ?? "-"}`);
  if (payload.metadata.warnings.length) console.log(`[提示] ${payload.metadata.warnings.join("；")}`);
}

main().catch((error) => {
  console.error(`[同步失败] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
