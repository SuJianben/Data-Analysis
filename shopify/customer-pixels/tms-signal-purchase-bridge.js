const TMS_SIGNAL_EVENT_ENDPOINT = "https://tkf-signal-user-events.trustmereview.workers.dev/v1/events";
const TMS_SIGNAL_VISITOR_KEY = "tms_signal_visitor_id";
const TMS_SIGNAL_SESSION_KEY = "tms_signal_session_id";

function tmsSafeIdentifier(value, fallback) {
  const normalized = String(value || "").replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

async function tmsSha256(value) {
  if (!value) return "";
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function tmsStorageValue(storage, key) {
  try { return (await storage.getItem(key)) || ""; } catch (_error) { return ""; }
}

function tmsDeviceCategory(event) {
  const userAgent = String(event.context?.navigator?.userAgent || "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/.test(userAgent)) return "mobile";
  return "desktop";
}

async function tmsSendPurchase(event) {
  const checkout = event.data?.checkout;
  if (!checkout) return;
  const storedVisitorId = await tmsStorageValue(browser.localStorage, TMS_SIGNAL_VISITOR_KEY);
  const storedSessionId = await tmsStorageValue(browser.sessionStorage, TMS_SIGNAL_SESSION_KEY);
  const fallbackSeed = tmsSafeIdentifier(event.clientId || event.id, "shopify_event");
  const visitorId = tmsSafeIdentifier(storedVisitorId, `visitor_shopify_${fallbackSeed}`);
  const sessionId = tmsSafeIdentifier(storedSessionId, `session_shopify_${fallbackSeed}`);
  const rawCustomerId = checkout.order?.customer?.id || checkout.customer?.id || "";
  const rawOrderId = checkout.order?.id || "";
  const [customerIdHash, orderIdHash] = await Promise.all([tmsSha256(rawCustomerId), tmsSha256(rawOrderId)]);
  const lineItems = Array.isArray(checkout.lineItems) ? checkout.lineItems : [];
  const itemCount = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const purchaseEvent = {
    eventId: tmsSafeIdentifier(`shopify_purchase_${event.id}`, `purchase_${fallbackSeed}`),
    visitorId,
    sessionId,
    eventName: "purchase",
    occurredAt: event.timestamp || new Date().toISOString(),
    pagePath: event.context?.document?.location?.pathname || "/checkouts/thank-you",
    pageSection: "checkout",
    clickTarget: "checkout_completed",
    deviceCategory: tmsDeviceCategory(event),
    metadata: { currency: checkout.currencyCode || "", value: Number(checkout.totalPrice?.amount || 0), itemCount, orderIdHash }
  };
  if (customerIdHash) purchaseEvent.customerIdHash = customerIdHash;
  await fetch(TMS_SIGNAL_EVENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ siteKey: "tms", source: "shopify_pixel:tms", event: purchaseEvent }),
    keepalive: true
  });
}

analytics.subscribe("checkout_completed", (event) => { tmsSendPurchase(event).catch(() => {}); });
