#!/usr/bin/env node

import { loadEnvironment } from "./lib/load-env.mjs";

loadEnvironment();

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultPeriod() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 2);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

async function fetchJson(url, init = {}, timeoutMs = 90_000) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error(`接口返回的不是 JSON（HTTP ${response.status}）`); }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `请求失败（HTTP ${response.status}）`);
  return payload;
}

function validateDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} 必须是 YYYY-MM-DD 格式`);
}

async function main() {
  const siteKey = (option("--site") || process.env.ANALYTICS_SITE || "tkf").toLowerCase();
  if (!["tkf", "tms", "fkk", "blk", "dtk"].includes(siteKey)) throw new Error("--site 只支持 tkf、tms、fkk、blk 或 dtk");
  const fallback = defaultPeriod();
  const startDate = option("--start-date") || fallback.startDate;
  const endDate = option("--end-date") || fallback.endDate;
  validateDate(startDate, "--start-date");
  validateDate(endDate, "--end-date");
  if (startDate > endDate) throw new Error("开始日期不能晚于结束日期");
  const propertyName = `${siteKey.toUpperCase()}_GA4_PROPERTY_ID`;
  const propertyId = process.env[propertyName]?.trim() || (siteKey === "tkf" ? process.env.GA4_PROPERTY_ID?.trim() || "546810508" : "");
  if (!propertyId) throw new Error(`缺少环境变量 ${propertyName}`);
  const localUrl = process.env.LOCAL_SYNC_URL?.trim() || "http://localhost:3000/api/sync/ga4";
  console.log(`[GA4 本地同步] ${siteKey.toUpperCase()}：${startDate} 至 ${endDate}`);
  const result = await fetchJson(localUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ siteKey, propertyId, startDate, endDate }),
  });
  console.log(`[GA4 本地同步] ${siteKey.toUpperCase()} 完成：${result.rowCount || 0} 行，syncId=${result.syncId ?? "-"}`);
}

main().catch((error) => {
  console.error(`[GA4 本地同步失败] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
