import type { UserEventPayload } from "./types";

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const PURCHASE_FASTPATH_VERSION = "2026-09-18.purchase-fastpath-v2";
const SHOPLINE_EVENT_ID = /^shopline_(page_view|global_click|add_to_cart|begin_checkout|purchase)_[a-zA-Z0-9._:-]+$/;
const SHOPLINE_VISITOR_ID = /^visitor_shopline_[a-zA-Z0-9._:-]+$/;
const CURRENCY = /^[A-Z]{3}$/;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 10 * 60 * 1_000;

function isFiniteNumberInRange(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

const eventPrefixes: Record<string, string> = {
  page_view: "shopline_page_view_",
  global_click: "shopline_global_click_",
  add_to_cart: "shopline_add_to_cart_",
  begin_checkout: "shopline_begin_checkout_",
  purchase: "shopline_purchase_",
};

function isRecentShoplineEvent(event: UserEventPayload["events"][number], now: number) {
  const occurredAt = Date.parse(event.occurredAt);
  const prefix = eventPrefixes[event.eventName];
  return (
    Boolean(prefix) &&
    SHOPLINE_EVENT_ID.test(event.eventId) &&
    event.eventId.startsWith(prefix) &&
    SHOPLINE_VISITOR_ID.test(event.visitorId) &&
    Number.isFinite(occurredAt) &&
    occurredAt >= now - MAX_EVENT_AGE_MS &&
    occurredAt <= now + MAX_FUTURE_SKEW_MS
  );
}

function hasValidCommerceMetadata(event: UserEventPayload["events"][number]) {
  const metadata = event.metadata || {};
  return (
    typeof metadata.currency === "string" &&
    CURRENCY.test(metadata.currency) &&
    isFiniteNumberInRange(metadata.value, 0, 1_000_000_000) &&
    isFiniteNumberInRange(metadata.itemCount, 1, 1_000)
  );
}

function hasPurchaseEvidence(metadata: Record<string, unknown>) {
  const hasLegacyHash = typeof metadata.orderIdHash === "string" && SHA256_HEX.test(metadata.orderIdHash);
  const hasFastPathEvidence = metadata.deliveryVersion === PURCHASE_FASTPATH_VERSION
    && metadata.idempotencySource === "shopline_event_id"
    && Array.isArray(metadata.items)
    && metadata.items.length > 0;
  return hasLegacyHash || hasFastPathEvidence;
}

function isShoplineEvent(event: UserEventPayload["events"][number], now: number) {
  if (!isRecentShoplineEvent(event, now)) return false;
  if (event.eventName === "page_view") return Boolean(event.pagePath);
  if (event.eventName === "global_click") return Boolean(event.elementKey && event.clickTarget);
  if (event.eventName === "add_to_cart") {
    return event.pageSection === "product" && event.clickTarget === "product_added_to_cart" && hasValidCommerceMetadata(event);
  }
  if (event.eventName === "begin_checkout") {
    return event.pageSection === "checkout" && event.clickTarget === "checkout_started" && hasValidCommerceMetadata(event);
  }
  const metadata = event.metadata || {};
  return (
    event.eventName === "purchase" &&
    event.pageSection === "checkout" &&
    event.clickTarget === "checkout_completed" &&
    hasPurchaseEvidence(metadata) &&
    hasValidCommerceMetadata(event)
  );
}

/**
 * SHOPLINE customer pixels run in an opaque-origin sandbox. Only BLK's tightly
 * validated standard/custom events can use that channel. Purchases additionally
 * require either the legacy hashed order ID or the fast-path product evidence.
 * Both versions are deduplicated by the platform event ID.
 */
export function isOpaqueShoplineEventRequest(
  request: Request,
  payload: UserEventPayload,
  now = Date.now(),
) {
  return (
    request.headers.get("Origin") === "null" &&
    payload.siteKey === "blk" &&
    payload.source === "shopline_pixel:blk" &&
    payload.events.length === 1 &&
    isShoplineEvent(payload.events[0], now)
  );
}
