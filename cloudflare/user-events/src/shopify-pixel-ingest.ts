import type { UserEventPayload } from "./types";

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const PURCHASE_FASTPATH_VERSION = "2026-09-18.purchase-fastpath-v2";
const LEGACY_PURCHASE_EVENT_ID = /^shopify_purchase_[a-zA-Z0-9._:-]+$/;
const SHOPIFY_EVENT_ID = /^shopify_(page_view|global_click|add_to_cart|begin_checkout|purchase)_[a-zA-Z0-9._:-]+$/;
const SHOPIFY_VISITOR_ID = /^shopify_(client|event)_[a-zA-Z0-9._:-]+$/;
const LEGACY_VISITOR_ID = /^visitor_[a-zA-Z0-9._:-]+$/;
const SHOPIFY_EVENT_NAMES = new Set(["page_view", "global_click", "add_to_cart", "begin_checkout", "purchase"]);
const IDENTITY_SOURCES = new Set(["shopify_client_id", "shopify_event_fallback"]);
const CURRENCY = /^[A-Z]{3}$/;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 10 * 60 * 1_000;

function sourceMatchesSite(payload: UserEventPayload) {
  if (payload.siteKey === "tkf") {
    return payload.source === "shopify_pixel" || payload.source === "shopify_pixel:tkf";
  }
  return payload.source === `shopify_pixel:${payload.siteKey}`;
}

function isFiniteNumberInRange(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function hasPurchaseEvidence(metadata: Record<string, unknown>) {
  const hasLegacyHash = typeof metadata.orderIdHash === "string" && SHA256_HEX.test(metadata.orderIdHash);
  const hasFastPathEvidence = metadata.deliveryVersion === PURCHASE_FASTPATH_VERSION
    && metadata.idempotencySource === "shopify_event_id"
    && Array.isArray(metadata.items)
    && metadata.items.length > 0;
  return hasLegacyHash || hasFastPathEvidence;
}

function hasValidPurchaseShape(event: UserEventPayload["events"][number], now: number) {
  const occurredAt = Date.parse(event.occurredAt);
  const metadata = event.metadata || {};
  return (
    (SHOPIFY_EVENT_ID.test(event.eventId) || LEGACY_PURCHASE_EVENT_ID.test(event.eventId)) &&
    event.eventName === "purchase" &&
    event.pageSection === "checkout" &&
    event.clickTarget === "checkout_completed" &&
    Number.isFinite(occurredAt) &&
    occurredAt >= now - MAX_EVENT_AGE_MS &&
    occurredAt <= now + MAX_FUTURE_SKEW_MS &&
    hasPurchaseEvidence(metadata) &&
    typeof metadata.currency === "string" &&
    CURRENCY.test(metadata.currency) &&
    isFiniteNumberInRange(metadata.value, 0, 1_000_000_000) &&
    isFiniteNumberInRange(metadata.itemCount, 1, 1_000)
  );
}

function isLegacyShopifyPurchaseEvent(event: UserEventPayload["events"][number], now: number) {
  return (
    LEGACY_PURCHASE_EVENT_ID.test(event.eventId) &&
    LEGACY_VISITOR_ID.test(event.visitorId) &&
    !event.metadata?.identitySource &&
    hasValidPurchaseShape(event, now)
  );
}

function isUnifiedShopifyEvent(event: UserEventPayload["events"][number], now: number) {
  const occurredAt = Date.parse(event.occurredAt);
  const metadata = event.metadata || {};
  const identitySource = metadata.identitySource;
  const identityMatches = identitySource === "shopify_client_id"
    ? event.visitorId.startsWith("shopify_client_")
    : identitySource === "shopify_event_fallback" && event.visitorId.startsWith("shopify_event_");
  return (
    SHOPIFY_EVENT_ID.test(event.eventId) &&
    SHOPIFY_EVENT_NAMES.has(event.eventName) &&
    SHOPIFY_VISITOR_ID.test(event.visitorId) &&
    IDENTITY_SOURCES.has(String(identitySource || "")) &&
    identityMatches &&
    Number.isFinite(occurredAt) &&
    occurredAt >= now - MAX_EVENT_AGE_MS &&
    occurredAt <= now + MAX_FUTURE_SKEW_MS &&
    (event.pagePath || "").length > 0 &&
    (event.eventName !== "global_click" || Boolean(event.elementKey || event.elementLabel)) &&
    (event.eventName !== "purchase" || hasValidPurchaseShape(event, now))
  );
}

/**
 * Shopify custom pixels run in a sandboxed iframe whose browser requests use the
 * opaque `Origin: null`. Only the tightly-scoped events produced by our connected
 * pixels are accepted through that otherwise denied path. Legacy purchase events
 * remain compatible only when they use the old visitor format and omit identitySource.
 */
export function isOpaqueShopifyPixelRequest(
  request: Request,
  payload: UserEventPayload,
  now = Date.now(),
) {
  return (
    request.headers.get("Origin") === "null" &&
    sourceMatchesSite(payload) &&
    payload.events.length === 1 &&
    (isUnifiedShopifyEvent(payload.events[0], now) || isLegacyShopifyPurchaseEvent(payload.events[0], now))
  );
}
