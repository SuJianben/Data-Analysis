// BLK GA4 ecommerce + Signal purchase - SHOPLINE Customer Events
const GA4_MEASUREMENT_ID = "G-TRCFQDSHYR";
const BLK_SIGNAL_EVENT_ENDPOINT = "https://blk-signal-user-events.trustmereview.workers.dev/v1/events";

const script = document.createElement("script");
script.setAttribute("src", "https://www.googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID);
script.setAttribute("async", "");
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", GA4_MEASUREMENT_ID, { send_page_view: false });

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function pageDetails(event) {
  return {
    page_location: event.data?.url || event.context?.document?.location?.href,
    page_title: event.data?.title || event.context?.document?.title,
    page_referrer: event.context?.document?.referrer || undefined,
  };
}

function pagePath(event, fallback) {
  return event.data?.path || event.context?.document?.location?.pathname || fallback || "/";
}

function shoplineItems(list) {
  return (Array.isArray(list) ? list : []).map((item) => ({
    item_id: item.skuItemNo || item.skuId || item.product_id || item.spuId,
    item_name: item.title || item.product_title || item.line_items_title,
    item_variant: item.variant || item.sku_title,
    item_category: item.category || item.custom_category,
    price: numberValue(item.final_price ?? item.price),
    quantity: Number(item.quantity || 1),
  }));
}

function safeIdentifier(value, fallback) {
  const normalized = String(value || "").replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

function isoTimestamp(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric).toISOString();
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

async function sha256(value) {
  if (!value) return "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function deviceCategory(event) {
  const userAgent = String(event.context?.navigator?.userAgent || "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/.test(userAgent)) return "mobile";
  return "desktop";
}

function signalEvent(event, eventName, overrides = {}) {
  const identity = safeIdentifier(event.clientId || event.id, "shopline_client");
  return {
    eventId: safeIdentifier(`shopline_${eventName}_${event.id}`, `shopline_${eventName}_${identity}`),
    visitorId: safeIdentifier(`visitor_shopline_${identity}`, "visitor_shopline_unknown"),
    eventName,
    occurredAt: isoTimestamp(event.timestamp),
    pagePath: pagePath(event, "/"),
    deviceCategory: deviceCategory(event),
    ...overrides,
  };
}

async function sendSignal(event) {
  await fetch(BLK_SIGNAL_EVENT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ siteKey: "blk", source: "shopline_pixel:blk", event }),
    keepalive: true,
  });
}

async function sendSignalPurchase(event) {
  const data = event.data || {};
  const order = data.checkout?.order || {};
  const rawOrderId = data.orderSeq || data.appOrderSeq || order.token || "";
  const list = Array.isArray(data.list) ? data.list : [];
  const itemCount = list.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (!rawOrderId || itemCount < 1) return;

  const fallbackSeed = safeIdentifier(event.clientId || event.id, "shopline_event");
  const [customerIdHash, orderIdHash] = await Promise.all([
    sha256(data.customer_id || ""),
    sha256(rawOrderId),
  ]);
  const currency = String(data.currency || order.currency_code || "").toUpperCase();
  const purchaseEvent = signalEvent(event, "purchase", {
    eventId: safeIdentifier("shopline_purchase_" + event.id, "shopline_purchase_" + fallbackSeed),
    pagePath: pagePath(event, "/checkouts/thank-you"),
    pageSection: "checkout",
    clickTarget: "checkout_completed",
    metadata: {
      currency,
      value: Number(data.value ?? order.total_price ?? 0),
      itemCount,
      orderIdHash,
      platform: "shopline",
    },
  });
  if (customerIdHash) purchaseEvent.customerIdHash = customerIdHash;
  await sendSignal(purchaseEvent);
}

analytics.subscribe("blk_signal_click", (event) => {
  const data = event.data || {};
  const clickParams = {
    page_path: data.page_path || "/",
    element_key: data.element_key || "other:unnamed",
    element_label: data.element_label || "",
    page_section: data.page_section || "other",
    destination_path: data.destination_path || "",
    click_target: data.click_target || "other",
    device_category: data.device_category || "unknown",
  };
  gtag("event", "global_click", clickParams);
  gtag("event", "page_heatmap_click", {
    page_path: clickParams.page_path,
    heatmap_cell: data.heatmap_cell || "x0_y0",
    element_group: data.element_group || clickParams.click_target,
    page_section: clickParams.page_section,
    click_target: clickParams.click_target,
    device_category: clickParams.device_category,
  });
  if (clickParams.page_section === "header" || clickParams.page_section === "navigation") {
    gtag("event", "header_navigation_click", {
      menu_name: clickParams.element_label || "(unnamed menu)",
      menu_key: clickParams.element_key,
      parent_menu_name: "",
      menu_level: "1",
      menu_action: clickParams.click_target === "toggle" ? "toggle" : "navigate",
      navigation_location: clickParams.page_section,
      click_target: clickParams.destination_path,
      device_category: clickParams.device_category,
    });
  }
  sendSignal(signalEvent(event, "global_click", {
    elementKey: clickParams.element_key,
    elementLabel: clickParams.element_label,
    pageSection: clickParams.page_section,
    destinationPath: clickParams.destination_path,
    clickTarget: clickParams.click_target,
    metadata: {
      heatmapCell: data.heatmap_cell || "x0_y0",
      elementGroup: data.element_group || clickParams.click_target,
    },
  })).catch(() => {});
});

analytics.subscribe("page_viewed", (event) => {
  gtag("event", "page_view", pageDetails(event));
  sendSignal(signalEvent(event, "page_view")).catch(() => {});
});

analytics.subscribe("product_added_to_cart", (event) => {
  const data = event.data || {};
  gtag("event", "add_to_cart", {
    ...pageDetails(event),
    currency: data.currency,
    value: numberValue(data.value),
    items: shoplineItems(data.list),
  });
  sendSignal(signalEvent(event, "add_to_cart", {
    pageSection: "product",
    clickTarget: "product_added_to_cart",
    metadata: {
      currency: String(data.currency || "").toUpperCase(),
      value: Number(data.value || 0),
      itemCount: (Array.isArray(data.list) ? data.list : []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    },
  })).catch(() => {});
});

analytics.subscribe("checkout_started", (event) => {
  const data = event.data || {};
  gtag("event", "begin_checkout", {
    ...pageDetails(event),
    currency: data.currency || data.checkout?.order?.currency_code,
    value: numberValue(data.value ?? data.checkout?.order?.total_price),
    items: shoplineItems(data.list),
  });
  sendSignal(signalEvent(event, "begin_checkout", {
    pageSection: "checkout",
    clickTarget: "checkout_started",
    metadata: {
      currency: String(data.currency || data.checkout?.order?.currency_code || "").toUpperCase(),
      value: Number(data.value ?? data.checkout?.order?.total_price ?? 0),
      itemCount: (Array.isArray(data.list) ? data.list : []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    },
  })).catch(() => {});
});

analytics.subscribe("checkout_completed", (event) => {
  const data = event.data || {};
  const order = data.checkout?.order || {};
  gtag("event", "purchase", {
    ...pageDetails(event),
    transaction_id: data.orderSeq || data.appOrderSeq || order.token,
    value: numberValue(data.value ?? order.total_price),
    tax: numberValue(data.taxAmount),
    shipping: numberValue(order.shipping_price),
    currency: data.currency || order.currency_code,
    coupon: data.coupon || undefined,
    items: shoplineItems(data.list),
  });
  sendSignalPurchase(event).catch(() => {});
});
