import type { UserEventRow } from "@/types/analytics";

type PurchaseItem = {
  itemName: string;
  itemVariant: string;
  quantity: number;
};

export type PurchaseEvidence = {
  primaryText: string;
  secondaryText: string;
  status: "complete" | "partial" | "review";
  statusLabel: string;
  explanation: string;
};

const JOURNEY_WINDOW_MS = 6 * 60 * 60 * 1_000;
const DELAY_REVIEW_MS = 5 * 60 * 1_000;

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function metadataItems(metadata: Record<string, unknown>): PurchaseItem[] {
  if (!Array.isArray(metadata.items)) return [];
  return metadata.items.flatMap((value) => {
    const item = recordValue(value);
    if (!item) return [];
    const itemName = textValue(item.itemName ?? item.item_name);
    const itemVariant = textValue(item.itemVariant ?? item.item_variant);
    const quantity = Math.max(1, Math.floor(numberValue(item.quantity) || 1));
    return itemName || itemVariant ? [{ itemName, itemVariant, quantity }] : [];
  });
}

function currencyValue(metadata: Record<string, unknown>) {
  const currency = textValue(metadata.currency).toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "";
}

function formatMoney(value: number | null, currency: string) {
  if (value === null || !currency) return "";
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value).replace(/\s+/g, " ");
  } catch {
    return `${currency} ${value.toLocaleString("zh-CN")}`;
  }
}

function relevantJourneyRows(purchase: UserEventRow, rows: UserEventRow[]) {
  const purchaseTime = Date.parse(purchase.occurredAt);
  if (!Number.isFinite(purchaseTime)) return [];
  const previousPurchaseTime = rows.reduce((latest, row) => {
    if (row.eventId === purchase.eventId || row.visitorId !== purchase.visitorId || row.eventName !== "purchase") return latest;
    const eventTime = Date.parse(row.occurredAt);
    return Number.isFinite(eventTime) && eventTime < purchaseTime ? Math.max(latest, eventTime) : latest;
  }, purchaseTime - JOURNEY_WINDOW_MS);
  return rows.filter((row) => {
    if (row.eventId === purchase.eventId || row.visitorId !== purchase.visitorId) return false;
    const eventTime = Date.parse(row.occurredAt);
    return Number.isFinite(eventTime)
      && eventTime <= purchaseTime
      && eventTime > previousPurchaseTime;
  });
}

function inferredItemNames(rows: UserEventRow[]) {
  return [...new Set(rows
    .filter((row) => row.eventName === "add_to_cart")
    .map((row) => row.elementLabel?.trim())
    .filter((value): value is string => Boolean(value))
  )];
}

function displayItems(items: PurchaseItem[], inferredNames: string[]) {
  const names = items.length
    ? items.map((item) => [item.itemName, item.itemVariant].filter(Boolean).join(" · "))
    : inferredNames;
  if (!names.length) return "购买完成";
  const visible = names.slice(0, 2).join("；");
  return names.length > 2 ? `${visible} 等 ${names.length} 项` : visible;
}

function duplicateOrderHash(purchase: UserEventRow, rows: UserEventRow[]) {
  const orderIdHash = textValue(purchase.metadata?.orderIdHash);
  if (!orderIdHash) return false;
  return rows.some((row) => row.eventId !== purchase.eventId
    && row.eventName === "purchase"
    && textValue(row.metadata?.orderIdHash) === orderIdHash);
}

export function purchaseEvidence(purchase: UserEventRow, rows: UserEventRow[]): PurchaseEvidence | null {
  if (purchase.eventName !== "purchase") return null;

  const metadata = purchase.metadata || {};
  const journeyRows = relevantJourneyRows(purchase, rows);
  const items = metadataItems(metadata);
  const inferredNames = inferredItemNames(journeyRows);
  const currency = currencyValue(metadata);
  const value = numberValue(metadata.value);
  const itemCount = numberValue(metadata.itemCount);
  const hasAddToCart = journeyRows.some((row) => row.eventName === "add_to_cart");
  const hasCheckout = journeyRows.some((row) => row.eventName === "begin_checkout");
  const isDuplicate = duplicateOrderHash(purchase, rows);
  const occurredAt = Date.parse(purchase.occurredAt);
  const receivedAt = Date.parse(purchase.receivedAt);
  const delayed = Number.isFinite(occurredAt) && Number.isFinite(receivedAt)
    && receivedAt - occurredAt > DELAY_REVIEW_MS;

  const evidenceParts = [
    formatMoney(value, currency),
    itemCount !== null && itemCount > 0 ? `${Math.floor(itemCount)} 件` : "",
    [hasAddToCart ? "加购" : "", hasCheckout ? "结账" : "", "购买"].filter(Boolean).join("→"),
  ].filter(Boolean);

  const missing: string[] = [];
  if (!currency || value === null) missing.push("金额或币种");
  if (itemCount === null || itemCount < 1) missing.push("商品件数");
  if (!items.length && !inferredNames.length) missing.push("商品信息");
  if (!hasCheckout) missing.push("开始结账事件");
  if (!hasAddToCart) missing.push("加购事件");

  if (isDuplicate || delayed) {
    const reasons = [isDuplicate ? "同一订单哈希出现重复购买" : "", delayed ? "入库延迟超过 5 分钟" : ""].filter(Boolean);
    return {
      primaryText: displayItems(items, inferredNames),
      secondaryText: evidenceParts.join(" · ") || "购买事件已记录",
      status: "review",
      statusLabel: "需核查",
      explanation: reasons.join("；"),
    };
  }

  const complete = missing.length === 0;
  const itemSource = items.length ? "商品来自购买事件" : inferredNames.length ? "商品来自该用户的加购链路" : "";
  return {
    primaryText: displayItems(items, inferredNames),
    secondaryText: evidenceParts.join(" · ") || "购买事件已记录",
    status: complete ? "complete" : "partial",
    statusLabel: complete ? "链路完整" : "部分证据",
    explanation: [itemSource, missing.length ? `未记录：${missing.join("、")}` : "金额、商品与前序行为均已记录"].filter(Boolean).join("；"),
  };
}
