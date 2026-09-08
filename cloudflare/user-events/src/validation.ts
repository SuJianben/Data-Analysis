import type { UserEventInput, UserEventPayload } from "./types";

const IDENTIFIER = /^[a-zA-Z0-9._:-]+$/;
const CUSTOMER_HASH = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new Error(`${field} 格式不正确。`);
  }
  return value;
}

function optionalString(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) throw new Error(`${field} 格式不正确。`);
  return value;
}

function parseEvent(value: unknown): UserEventInput {
  if (!isRecord(value)) throw new Error("事件内容格式不正确。");
  const eventId = requiredString(value.eventId, "eventId", 8, 160);
  const visitorId = requiredString(value.visitorId, "visitorId", 8, 160);
  const eventName = requiredString(value.eventName, "eventName", 1, 120);
  const occurredAt = requiredString(value.occurredAt, "occurredAt", 10, 80);
  const customerIdHash = optionalString(value.customerIdHash, "customerIdHash", 200);

  if (!IDENTIFIER.test(eventId) || !IDENTIFIER.test(visitorId) || !IDENTIFIER.test(eventName)) {
    throw new Error("事件标识包含不允许的字符。");
  }
  if (customerIdHash && !CUSTOMER_HASH.test(customerIdHash)) {
    throw new Error("customerIdHash 必须是 64 位十六进制哈希，不能提交原始客户 ID。");
  }
  if (Number.isNaN(Date.parse(occurredAt))) throw new Error("occurredAt 不是有效时间。");
  if (value.metadata !== undefined && !isRecord(value.metadata)) throw new Error("metadata 格式不正确。");
  if (value.metadata && JSON.stringify(value.metadata).length > 8_000) throw new Error("metadata 内容过大。");

  return {
    eventId,
    visitorId,
    customerIdHash,
    sessionId: optionalString(value.sessionId, "sessionId", 160),
    eventName,
    occurredAt,
    pagePath: optionalString(value.pagePath, "pagePath", 2_000),
    elementKey: optionalString(value.elementKey, "elementKey", 300),
    elementLabel: optionalString(value.elementLabel, "elementLabel", 500),
    pageSection: optionalString(value.pageSection, "pageSection", 200),
    destinationPath: optionalString(value.destinationPath, "destinationPath", 2_000),
    clickTarget: optionalString(value.clickTarget, "clickTarget", 120),
    deviceCategory: optionalString(value.deviceCategory, "deviceCategory", 40),
    metadata: value.metadata as Record<string, unknown> | undefined,
  };
}

export function parseUserEventPayload(value: unknown): UserEventPayload {
  if (!isRecord(value)) throw new Error("请求内容格式不正确。");
  const source = value.source === undefined ? "shopify" : requiredString(value.source, "source", 1, 80);
  const rawEvents = Array.isArray(value.events) ? value.events : value.event ? [value.event] : [];
  if (!rawEvents.length || rawEvents.length > 50) throw new Error("每次需要提交 1 至 50 个事件。");
  return { source, events: rawEvents.map(parseEvent) };
}

export function parseIdentityKey(value: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const match = decoded.match(/^(customer|visitor):([a-zA-Z0-9._:-]{8,200})$/);
  if (!match) return null;
  if (match[1] === "customer" && !CUSTOMER_HASH.test(match[2])) return null;
  return { type: match[1] as "customer" | "visitor", id: match[2], key: decoded };
}
