#!/usr/bin/env node

import { PollingQueueClient } from "@vercel/queue";
import { writeFileSync } from "node:fs";
import { loadEnvironment } from "./lib/load-env.mjs";

loadEnvironment();

const topic = process.env.USER_EVENT_QUEUE_TOPIC || "signal-user-events-v1";
const region = process.env.USER_EVENT_QUEUE_REGION || "fra1";
const consumerGroup = process.env.USER_EVENT_QUEUE_CONSUMER || "local-sqlite-v1";
const localEndpoint = process.env.LOCAL_EVENT_INGEST_URL || "http://localhost:3000/api/events";
const queueTokenUrl = process.env.LOCAL_QUEUE_TOKEN_URL || "https://multi-site-analytics.vercel.app/api/sync/queue-token";
const maxBatches = Math.max(1, Number(process.env.USER_EVENT_QUEUE_MAX_BATCHES || 100));
const resultFileIndex = process.argv.indexOf("--result-file");
const resultFile = resultFileIndex >= 0 ? process.argv[resultFileIndex + 1] : "";

async function fetchProductionQueueToken() {
  if (process.env.VERCEL_QUEUE_POLL_TOKEN) return process.env.VERCEL_QUEUE_POLL_TOKEN;
  const accessKey = process.env.LOCAL_SYNC_ACCESS_KEY || process.env.USER_EVENT_FORWARD_KEY;
  if (!accessKey) throw new Error("缺少 LOCAL_SYNC_ACCESS_KEY 或 USER_EVENT_FORWARD_KEY，无法取得生产队列凭证。");
  const response = await fetch(queueTokenUrl, {
    headers: { "x-local-sync-key": accessKey },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token) throw new Error(payload.error || `生产队列凭证请求失败（HTTP ${response.status}）。`);
  return payload.token;
}

function assertMessage(message) {
  if (!message || typeof message !== "object") throw new Error("队列消息不是对象。");
  if (message.schemaVersion !== "2026-09-17.v1") throw new Error("队列消息版本不受支持。");
  if (!message.siteKey || !message.source || !Array.isArray(message.events) || !message.events.length) throw new Error("队列消息缺少事件内容。");
  return message;
}

async function storeLocally(message) {
  const payload = assertMessage(message);
  const response = await fetch(localEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "multi-site-local-queue-consumer/1.0" },
    body: JSON.stringify({ siteKey: payload.siteKey, source: payload.source, events: payload.events }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let result;
  try { result = text ? JSON.parse(text) : {}; } catch { throw new Error(`本地事件接口返回非 JSON（HTTP ${response.status}）。`); }
  if (!response.ok || result.ok === false) throw new Error(result.error || `本地事件写入失败（HTTP ${response.status}）。`);
  return result;
}

async function main() {
  const token = await fetchProductionQueueToken();
  const queue = new PollingQueueClient({ region, deploymentId: null, token });
  let handled = 0;
  let inserted = 0;
  let priorityInsertions = 0;
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const result = await queue.receive(topic, consumerGroup, async (message, metadata) => {
      const stored = await storeLocally(message);
      handled += Number(stored.received || 0);
      inserted += Number(stored.inserted || 0);
      if (Number(stored.inserted || 0) > 0 && payload.events.some((event) => event.eventName === "purchase")) {
        priorityInsertions += payload.events.filter((event) => event.eventName === "purchase").length;
      }
      console.log(`[事件回收] ${metadata.messageId}：收到 ${stored.received || 0}，新增 ${stored.inserted || 0}`);
    }, { limit: 10, visibilityTimeoutSeconds: 120, cursorFallback: "earliest" });
    if (!result.ok && result.reason === "empty") break;
  }
  if (resultFile) writeFileSync(resultFile, JSON.stringify({ handled, inserted, priorityInsertions }), "utf8");
  console.log(`[事件回收] 完成，本次处理 ${handled} 条事件。`);
}

main().catch((error) => {
  console.error(`[事件回收失败] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
