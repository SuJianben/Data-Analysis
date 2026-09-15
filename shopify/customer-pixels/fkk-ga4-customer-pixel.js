// FKK GA4 ecommerce + unified Signal journey - Shopify Customer Events
const GA4_MEASUREMENT_ID = 'G-51EXGWMTDP';
const FKK_SIGNAL_EVENT_ENDPOINT = 'https://fkk-signal-user-events.trustmereview.workers.dev/v1/events';

const script = document.createElement('script');
script.setAttribute('src', 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID);
script.setAttribute('async', '');
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', GA4_MEASUREMENT_ID, { send_page_view: false });

function eventPage(event) {
  return {
    page_location: event.context?.document?.location?.href,
    page_title: event.context?.document?.title,
    page_referrer: event.context?.document?.referrer || undefined,
  };
}

function pagePath(event, fallback = '/') {
  return event.context?.document?.location?.pathname || fallback;
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

function safeIdentifier(value, fallback = '') {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9._:-]/g, '_').slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

function safeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

async function sha256(value) {
  if (!value) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function signalIdentity(event) {
  const clientId = safeIdentifier(event.clientId);
  if (clientId) {
    return { visitorId: `shopify_client_${clientId}`, identitySource: 'shopify_client_id' };
  }
  const eventId = safeIdentifier(event.id, String(Date.now()));
  return { visitorId: `shopify_event_${eventId}`, identitySource: 'shopify_event_fallback' };
}

function deviceCategory(event, explicitValue = '') {
  const explicit = safeText(explicitValue, 40);
  if (explicit) return explicit;
  const userAgent = String(event.context?.navigator?.userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android/.test(userAgent)) return 'mobile';
  return 'desktop';
}

async function signalEventId(eventName, event, identity, fields) {
  const windowSeconds = eventName === 'page_view' ? 300 : eventName === 'global_click' ? 5 : 0;
  if (!windowSeconds) {
    return `shopify_${eventName}_${safeIdentifier(event.id, String(Date.now())).slice(0, 120)}`;
  }
  const occurredAt = Date.parse(event.timestamp || '');
  const bucket = Math.floor((Number.isFinite(occurredAt) ? occurredAt : Date.now()) / (windowSeconds * 1000));
  const signature = [
    identity.visitorId,
    eventName,
    fields.pagePath || pagePath(event),
    fields.elementKey || '',
    fields.elementLabel || '',
    bucket,
  ].join('|');
  const signatureHash = await sha256(signature);
  return `shopify_${eventName}_dedupe_${signatureHash.slice(0, 24)}_${bucket.toString(36)}`;
}

async function sendSignal(eventName, event, fields = {}, metadata = {}, rawCustomerId = '') {
  const identity = signalIdentity(event);
  const windowSeconds = eventName === 'page_view' ? 300 : eventName === 'global_click' ? 5 : 0;
  const customerIdHash = await sha256(rawCustomerId || init?.data?.customer?.id || '');
  const signalEvent = {
    eventId: await signalEventId(eventName, event, identity, fields),
    visitorId: identity.visitorId,
    eventName,
    occurredAt: event.timestamp || new Date().toISOString(),
    pagePath: safeText(fields.pagePath || pagePath(event), 2000) || '/',
    elementKey: safeText(fields.elementKey, 300),
    elementLabel: safeText(fields.elementLabel, 500),
    pageSection: safeText(fields.pageSection, 200),
    destinationPath: safeText(fields.destinationPath, 2000),
    clickTarget: safeText(fields.clickTarget, 120),
    deviceCategory: deviceCategory(event, fields.deviceCategory),
    metadata: {
      ...metadata,
      identitySource: identity.identitySource,
      ...(windowSeconds ? { dedupeWindowSeconds: windowSeconds } : {}),
    },
  };
  if (customerIdHash) signalEvent.customerIdHash = customerIdHash;
  await fetch(FKK_SIGNAL_EVENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ siteKey: 'fkk', source: 'shopify_pixel:fkk', event: signalEvent }),
    keepalive: true,
  });
}

analytics.subscribe('page_viewed', (event) => {
  gtag('event', 'page_view', eventPage(event));
  sendSignal('page_view', event, { pageSection: 'page', clickTarget: 'page_viewed' }).catch(() => {});
});

analytics.subscribe('product_added_to_cart', (event) => {
  const cartLine = event.data.cartLine;
  const merchandise = cartLine?.merchandise || {};
  const price = moneyAmount(merchandise.price);
  const quantity = Number(cartLine?.quantity || 1);
  const itemName = merchandise.product?.title || merchandise.title || '';
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
  sendSignal('add_to_cart', event, {
    elementKey: safeIdentifier(merchandise.sku || merchandise.id, 'product_item'),
    elementLabel: itemName,
    pageSection: 'product',
    clickTarget: 'product_added_to_cart',
  }, { currency: merchandise.price?.currencyCode || '', value: price === undefined ? 0 : price * quantity, quantity }).catch(() => {});
});

analytics.subscribe('checkout_started', (event) => {
  const checkout = event.data.checkout;
  gtag('event', 'begin_checkout', {
    ...eventPage(event),
    currency: checkout?.currencyCode,
    value: moneyAmount(checkout?.totalPrice),
    items: checkoutItems(checkout),
  });
  sendSignal('begin_checkout', event, {
    pagePath: pagePath(event, '/checkouts'),
    pageSection: 'checkout',
    clickTarget: 'checkout_started',
  }, { currency: checkout?.currencyCode || '', value: Number(checkout?.totalPrice?.amount || 0) }).catch(() => {});
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
  const lineItems = Array.isArray(checkout?.lineItems) ? checkout.lineItems : [];
  const itemCount = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  sha256(checkout?.order?.id || '').then((orderIdHash) => sendSignal('purchase', event, {
    pagePath: pagePath(event, '/checkouts/thank-you'),
    pageSection: 'checkout',
    clickTarget: 'checkout_completed',
  }, {
    currency: checkout?.currencyCode || '',
    value: Number(checkout?.totalPrice?.amount || 0),
    itemCount,
    orderIdHash,
  }, checkout?.order?.customer?.id || checkout?.customer?.id || '')).catch(() => {});
});

analytics.subscribe('all_custom_events', (event) => {
  if (!String(event.name || '').startsWith('fkk:')) return;
  const customData = event.customData || event.data || {};
  const eventName = customData.ga4EventName || String(event.name).slice(4);
  const params = { ...customData };
  delete params.ga4EventName;
  delete params.component;
  gtag('event', eventName, { ...eventPage(event), ...params });
  if (eventName !== 'global_click') return;
  sendSignal('global_click', event, {
    pagePath: customData.page_path || pagePath(event),
    elementKey: customData.element_key,
    elementLabel: customData.element_label,
    pageSection: customData.page_section,
    destinationPath: customData.destination_path,
    clickTarget: customData.click_target,
    deviceCategory: customData.device_category,
  }).catch(() => {});
});
