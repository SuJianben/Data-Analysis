// TMS GA4 + Signal - Shopify Customer Events
const GA4_MEASUREMENT_ID = 'G-6CCD7E5TD3';
const TMS_SIGNAL_EVENT_ENDPOINT = 'https://tkf-signal-user-events.trustmereview.workers.dev/v1/events';
const TMS_SIGNAL_VISITOR_KEY = 'tms_signal_visitor_id';
const TMS_SIGNAL_SESSION_KEY = 'tms_signal_session_id';

const script = document.createElement('script');
script.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID);
script.setAttribute('async', '');
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', GA4_MEASUREMENT_ID, { send_page_view: false });

gtag('consent', 'update', {
  'ad_storage': 'granted',
  'analytics_storage': 'granted',
  'ad_user_data': 'granted',
  'ad_personalization': 'granted',
});
function eventPage(event) {
  return {
    page_location: event.context?.document?.location?.href,
    page_title: event.context?.document?.title,
    page_referrer: event.context?.document?.referrer || undefined,
  };
}

function moneyAmount(money) {
  const amount = Number(money?.amount ?? money);
  return Number.isFinite(amount) ? amount : undefined;
}

function checkoutItems(checkout) {
  return (checkout?.lineItems || []).map((lineItem) => {
    const variant = lineItem.variant || lineItem.merchandise || {};
    return {
      item_id: variant.sku || variant.id || lineItem.id,
      item_name: lineItem.title || variant.product?.title,
      item_variant: variant.title,
      price: moneyAmount(variant.price),
      quantity: Number(lineItem.quantity || 1),
    };
  });
}

function safeIdentifier(value, fallback) {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9._:-]/g, '_').slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

async function sha256(value) {
  if (!value) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function storageValue(storage, key) {
  try { return (await storage.getItem(key)) || ''; } catch (_error) { return ''; }
}

function deviceCategory(event) {
  const userAgent = String(event.context?.navigator?.userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android/.test(userAgent)) return 'mobile';
  return 'desktop';
}

async function sendSignalPurchase(event) {
  const checkout = event.data?.checkout;
  if (!checkout) return;
  const storedVisitorId = await storageValue(browser.localStorage, TMS_SIGNAL_VISITOR_KEY);
  const storedSessionId = await storageValue(browser.sessionStorage, TMS_SIGNAL_SESSION_KEY);
  const fallbackSeed = safeIdentifier(event.clientId || event.id, 'shopify_event');
  const visitorId = safeIdentifier(storedVisitorId, `visitor_shopify_${fallbackSeed}`);
  const sessionId = safeIdentifier(storedSessionId, `session_shopify_${fallbackSeed}`);
  const [customerIdHash, orderIdHash] = await Promise.all([
    sha256(checkout.order?.customer?.id || checkout.customer?.id || ''),
    sha256(checkout.order?.id || ''),
  ]);
  const lineItems = Array.isArray(checkout.lineItems) ? checkout.lineItems : [];
  const itemCount = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const purchaseEvent = {
    eventId: safeIdentifier(`shopify_purchase_${event.id}`, `purchase_${fallbackSeed}`),
    visitorId,
    sessionId,
    eventName: 'purchase',
    occurredAt: event.timestamp || new Date().toISOString(),
    pagePath: event.context?.document?.location?.pathname || '/checkouts/thank-you',
    pageSection: 'checkout',
    clickTarget: 'checkout_completed',
    deviceCategory: deviceCategory(event),
    metadata: {
      currency: checkout.currencyCode || '',
      value: Number(checkout.totalPrice?.amount || 0),
      itemCount,
      orderIdHash,
    },
  };
  if (customerIdHash) purchaseEvent.customerIdHash = customerIdHash;
  await fetch(TMS_SIGNAL_EVENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ siteKey: 'tms', source: 'shopify_pixel:tms', event: purchaseEvent }),
    keepalive: true,
  });
}

analytics.subscribe('page_viewed', (event) => {
  gtag('event', 'page_view', eventPage(event));
});

analytics.subscribe('product_added_to_cart', (event) => {
  const cartLine = event.data.cartLine;
  const merchandise = cartLine?.merchandise || {};
  const price = moneyAmount(merchandise.price);
  const quantity = Number(cartLine?.quantity || 1);
  gtag('event', 'add_to_cart', {
    ...eventPage(event),
    currency: merchandise.price?.currencyCode,
    value: price === undefined ? undefined : price * quantity,
    items: [{
      item_id: merchandise.sku || merchandise.id,
      item_name: merchandise.product?.title,
      item_variant: merchandise.title,
      price,
      quantity,
    }],
  });
});

analytics.subscribe('checkout_started', (event) => {
  const checkout = event.data.checkout;
  gtag('event', 'begin_checkout', {
    ...eventPage(event),
    currency: checkout?.currencyCode,
    value: moneyAmount(checkout?.totalPrice),
    items: checkoutItems(checkout),
  });
});

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data.checkout;
  const coupon = (checkout?.discountApplications || [])
    .map((discount) => discount.title || discount.code)
    .filter(Boolean)
    .join(', ');
  gtag('event', 'purchase', {
    ...eventPage(event),
    transaction_id: checkout?.order?.id,
    value: moneyAmount(checkout?.totalPrice),
    tax: moneyAmount(checkout?.totalTax),
    shipping: moneyAmount(checkout?.shippingLine?.price),
    currency: checkout?.currencyCode,
    coupon: coupon || undefined,
    items: checkoutItems(checkout),
  });
  sendSignalPurchase(event).catch(() => {});
});

analytics.subscribe('all_custom_events', (event) => {
  if (!String(event.name || '').startsWith('tms:')) return;
  const customData = event.customData || event.data || {};
  const eventName = customData.ga4EventName || String(event.name).slice(4);
  const params = { ...customData };
  delete params.ga4EventName;
  gtag('event', eventName, { ...eventPage(event), ...params });
});
