import { appConfig } from "@/config/env";
import { saveUserEvents } from "@/services/database/user-event-repository";
import { queueUserEvents } from "@/services/queue/user-event-queue";
import type { UserEventInput } from "@/types/analytics";
import type { SiteKey } from "@/config/sites";

type ForwardResponse = {
  ok?: boolean;
  inserted?: number;
  error?: string;
};

export type UserEventIngestionResult = {
  mode: "stored" | "queued" | "forwarded";
  received: number;
  inserted: number;
  messageId?: string | null;
};

export async function ingestUserEvents(source: string, events: UserEventInput[], siteKey: SiteKey = "tkf"): Promise<UserEventIngestionResult> {
  const mode = appConfig.userEventStorageMode || (process.env.VERCEL ? (appConfig.userEventForwardUrl ? "forward" : "queue") : "local");
  if (mode === "local") {
    return { mode: "stored", received: events.length, inserted: saveUserEvents(source, events, siteKey) };
  }

  if (mode === "queue") {
    const queued = await queueUserEvents(siteKey, source, events);
    return { mode: "queued", received: events.length, inserted: 0, messageId: queued.messageId };
  }

  if (mode !== "forward" || !appConfig.userEventForwardUrl) {
    throw new Error("用户事件存储模式配置不正确。");
  }

  const endpoint = new URL(appConfig.userEventForwardUrl);
  if (!/^https?:$/.test(endpoint.protocol)) {
    throw new Error("用户事件转发地址必须使用 HTTP 或 HTTPS。");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (appConfig.userEventForwardKey) headers["x-tkf-ingest-key"] = appConfig.userEventForwardKey;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ siteKey, source, events }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let payload: ForwardResponse = {};
  try {
    payload = text ? JSON.parse(text) as ForwardResponse : {};
  } catch {
    throw new Error(`用户事件转发服务返回了非 JSON 内容（HTTP ${response.status}）。`);
  }
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `用户事件转发失败（HTTP ${response.status}）。`);
  }

  return {
    mode: "forwarded",
    received: events.length,
    inserted: Number(payload.inserted || 0),
  };
}
