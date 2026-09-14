import type { UserEventPayload } from "./types";

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const SHOPIFY_EVENT_ID = /^shopify_purchase_[a-zA-Z0-9._:-]+$/;
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

function isShopifyPurchaseEvent(event: UserEventPayload["events"][number], now: number) {
  const occurredAt = Date.parse(event.occurredAt);
  const metadata = event.metadata || {};
  return (
    SHOPIFY_EVENT_ID.test(event.eventId) &&
    event.eventName === "purchase" &&
    event.pageSection === "checkout" &&
    event.clickTarget === "checkout_completed" &&
    Number.isFinite(occurredAt) &&
    occurredAt >= now - MAX_EVENT_AGE_MS &&
    occurredAt <= now + MAX_FUTURE_SKEW_MS &&
    typeof metadata.orderIdHash === "string" &&
    SHA256_HEX.test(metadata.orderIdHash) &&
    typeof metadata.currency === "string" &&
    CURRENCY.test(metadata.currency) &&
    isFiniteNumberInRange(metadata.value, 0, 1_000_000_000) &&
    isFiniteNumberInRange(metadata.itemCount, 1, 1_000)
  );
}

/**
 * Shopify custom pixels run in a sandboxed iframe whose browser requests use the
 * opaque `Origin: null`. Only the tightly-scoped, deduplicated purchase payload
 * produced by our connected pixel is accepted through that otherwise denied path.
 */
export function isOpaqueShopifyPurchaseRequest(
  request: Request,
  payload: UserEventPayload,
  now = Date.now(),
) {
  return (
    request.headers.get("Origin") === "null" &&
    sourceMatchesSite(payload) &&
    payload.events.length === 1 &&
    isShopifyPurchaseEvent(payload.events[0], now)
  );
}
