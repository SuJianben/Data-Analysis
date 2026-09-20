import { appConfig } from "@/config/env";
import { sites, type SiteKey } from "@/config/sites";
import type { UserEventInput } from "@/types/analytics";

type UserEventPayload = {
  siteKey: SiteKey;
  source: string;
  events: UserEventInput[];
};

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const PURCHASE_FASTPATH_VERSION = "2026-09-18.purchase-fastpath-v2";
const CURRENCY = /^[A-Z]{3}$/;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 10 * 60 * 1_000;
const SHOPIFY_EVENT_ID = /^shopify_(page_view|global_click|add_to_cart|begin_checkout|purchase)_[a-zA-Z0-9._:-]+$/;
const SHOPIFY_VISITOR_ID = /^shopify_(client|event)_[a-zA-Z0-9._:-]+$/;
const SHOPLINE_EVENT_ID = /^shopline_(page_view|global_click|add_to_cart|begin_checkout|purchase)_[a-zA-Z0-9._:-]+$/;
const SHOPLINE_VISITOR_ID = /^visitor_shopline_[a-zA-Z0-9._:-]+$/;
const EVENT_NAMES = new Set(["page_view", "global_click", "add_to_cart", "begin_checkout", "purchase"]);

function finiteNumber(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function recentEvent(event: UserEventInput, now: number) {
  const occurredAt = Date.parse(event.occurredAt);
  return Number.isFinite(occurredAt) && occurredAt >= now - MAX_EVENT_AGE_MS && occurredAt <= now + MAX_FUTURE_SKEW_MS;
}

function commerceMetadata(event: UserEventInput) {
  const metadata = event.metadata || {};
  return typeof metadata.currency === "string"
    && CURRENCY.test(metadata.currency)
    && finiteNumber(metadata.value, 0, 1_000_000_000)
    && finiteNumber(metadata.itemCount, 1, 1_000);
}

function purchaseEvidence(event: UserEventInput, idempotencySource: "shopify_event_id" | "shopline_event_id") {
  const metadata = event.metadata || {};
  const hasLegacyHash = typeof metadata.orderIdHash === "string" && SHA256_HEX.test(metadata.orderIdHash);
  const hasFastPathEvidence = metadata.deliveryVersion === PURCHASE_FASTPATH_VERSION
    && metadata.idempotencySource === idempotencySource
    && Array.isArray(metadata.items)
    && metadata.items.length > 0;
  return hasLegacyHash || hasFastPathEvidence;
}

function validPurchase(event: UserEventInput, idempotencySource: "shopify_event_id" | "shopline_event_id") {
  return event.eventName === "purchase"
    && event.pageSection === "checkout"
    && event.clickTarget === "checkout_completed"
    && purchaseEvidence(event, idempotencySource)
    && commerceMetadata(event);
}

function validShopifyPixel(payload: UserEventPayload, now: number) {
  if (payload.source !== `shopify_pixel:${payload.siteKey}` && !(payload.siteKey === "tkf" && payload.source === "shopify_pixel")) return false;
  const event = payload.events[0];
  const identitySource = String(event.metadata?.identitySource || "");
  const identityMatches = identitySource === "shopify_client_id"
    ? event.visitorId.startsWith("shopify_client_")
    : identitySource === "shopify_event_fallback" && event.visitorId.startsWith("shopify_event_");
  return SHOPIFY_EVENT_ID.test(event.eventId)
    && SHOPIFY_VISITOR_ID.test(event.visitorId)
    && EVENT_NAMES.has(event.eventName)
    && identityMatches
    && recentEvent(event, now)
    && Boolean(event.pagePath)
    && (event.eventName !== "global_click" || Boolean(event.elementKey || event.elementLabel))
    && (event.eventName !== "purchase" || validPurchase(event, "shopify_event_id"));
}

function validShoplinePixel(payload: UserEventPayload, now: number) {
  if (sites[payload.siteKey].platform !== "shopline" || payload.source !== `shopline_pixel:${payload.siteKey}`) return false;
  const event = payload.events[0];
  if (!SHOPLINE_EVENT_ID.test(event.eventId) || !SHOPLINE_VISITOR_ID.test(event.visitorId) || !recentEvent(event, now)) return false;
  if (event.eventName === "page_view") return Boolean(event.pagePath);
  if (event.eventName === "global_click") return Boolean(event.elementKey && event.clickTarget);
  if (event.eventName === "add_to_cart") return event.pageSection === "product" && event.clickTarget === "product_added_to_cart" && commerceMetadata(event);
  if (event.eventName === "begin_checkout") return event.pageSection === "checkout" && event.clickTarget === "checkout_started" && commerceMetadata(event);
  return validPurchase(event, "shopline_event_id");
}

function allowedStorefrontOrigin(origin: string, siteKey: SiteKey) {
  if (appConfig.userEventAllowedOrigins.length && !appConfig.userEventAllowedOrigins.includes(origin)) return false;
  const domain = sites[siteKey].domain;
  return origin === `https://${domain}` || origin === `https://www.${domain}`;
}

export function authorizeUserEventRequest(request: Request, payload: UserEventPayload, now = Date.now()) {
  const origin = request.headers.get("origin");
  const suppliedKey = request.headers.get("x-signal-ingest-key") || request.headers.get("x-tkf-ingest-key");
  if (appConfig.userEventIngestKey && suppliedKey === appConfig.userEventIngestKey) return true;
  if (origin && origin !== "null" && allowedStorefrontOrigin(origin, payload.siteKey)) return true;
  if (origin === "null" && payload.events.length === 1) {
    return sites[payload.siteKey].platform === "shopline"
      ? validShoplinePixel(payload, now)
      : validShopifyPixel(payload, now);
  }
  return !process.env.VERCEL && !origin && !appConfig.userEventIngestKey;
}

export function isAllowedPreflightOrigin(origin: string | null) {
  if (!origin || origin === "null") return false;
  return Object.keys(sites).some((key) => allowedStorefrontOrigin(origin, key as SiteKey));
}
