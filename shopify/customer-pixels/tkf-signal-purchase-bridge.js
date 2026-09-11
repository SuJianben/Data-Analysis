/*
 * Append this block to the connected Shopify custom pixel.
 * It mirrors checkout_completed into TKF Signal without sending raw customer or order IDs.
 */
const TKF_SIGNAL_EVENT_ENDPOINT = "https://tkf-signal-user-events.trustmereview.workers.dev/v1/events";
const TKF_SIGNAL_VISITOR_KEY = "tkf_signal_visitor_id";
const TKF_SIGNAL_SESSION_KEY = "tkf_signal_session_id";

function tkfSafeIdentifier(value, fallback) {
  const normalized = String(value || "").replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

async function tkfSha256(value) {
  if (!value) return "";
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function tkfStorageValue(storage, key) {
  try {
    return (await storage.getItem(key)) || "";
  } catch (_error) {
    return "";
  }
}

function tkfDeviceCategory(event) {
  const userAgent = String(event.context?.navigator?.userAgent || "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/.test(userAgent)) return "mobile";
  return "desktop";
}

async function tkfSendPurchase(event) {
  const checkout = event.data?.checkout;
  if (!checkout) return;

  const storedVisitorId = await tkfStorageValue(browser.localStorage, TKF_SIGNAL_VISITOR_KEY);
  const storedSessionId = await tkfStorageValue(browser.sessionStorage, TKF_SIGNAL_SESSION_KEY);
  const fallbackSeed = tkfSafeIdentifier(event.clientId || event.id, "shopify_event");
  const visitorId = tkfSafeIdentifier(storedVisitorId, `visitor_shopify_${fallbackSeed}`);
  const sessionId = tkfSafeIdentifier(storedSessionId, `session_shopify_${fallbackSeed}`);
  const rawCustomerId = checkout.order?.customer?.id || checkout.customer?.id || "";
  const rawOrderId = checkout.order?.id || "";
  const [customerIdHash, orderIdHash] = await Promise.all([
    tkfSha256(rawCustomerId),
    tkfSha256(rawOrderId),
  ]);
  const lineItems = Array.isArray(checkout.lineItems) ? checkout.lineItems : [];
  const itemCount = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const eventId = tkfSafeIdentifier(`shopify_purchase_${event.id}`, `purchase_${fallbackSeed}`);

  const purchaseEvent = {
    eventId,
    visitorId,
    sessionId,
    eventName: "purchase",
    occurredAt: event.timestamp || new Date().toISOString(),
    pagePath: event.context?.document?.location?.pathname || "/checkouts/thank-you",
    pageSection: "checkout",
    clickTarget: "checkout_completed",
    deviceCategory: tkfDeviceCategory(event),
    metadata: {
      currency: checkout.currencyCode || "",
      value: Number(checkout.totalPrice?.amount || 0),
      itemCount,
      orderIdHash,
    },
  };
  if (customerIdHash) purchaseEvent.customerIdHash = customerIdHash;

  await fetch(TKF_SIGNAL_EVENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ source: "shopify_pixel", event: purchaseEvent }),
    keepalive: true,
  });
}

analytics.subscribe("checkout_completed", (event) => {
  tkfSendPurchase(event).catch(() => {});
});
