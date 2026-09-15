/*
 * Add this block once to the connected TKF Shopify custom pixel.
 * It records the full Signal journey with Shopify clientId as the canonical visitor identity.
 */
const TKF_SIGNAL_EVENT_ENDPOINT = 'https://tkf-signal-user-events.trustmereview.workers.dev/v1/events';

function tkfSafeIdentifier(value, fallback = '') {
  const normalized = String(value || '').replace(/[^a-zA-Z0-9._:-]/g, '_').slice(0, 140);
  return normalized.length >= 8 ? normalized : fallback;
}

function tkfSafeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

async function tkfSha256(value) {
  if (!value) return '';
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function tkfPagePath(event, fallback = '/') {
  return event.context?.document?.location?.pathname || fallback;
}

function tkfIdentity(event) {
  const clientId = tkfSafeIdentifier(event.clientId);
  if (clientId) return { visitorId: `shopify_client_${clientId}`, identitySource: 'shopify_client_id' };
  const eventId = tkfSafeIdentifier(event.id, String(Date.now()));
  return { visitorId: `shopify_event_${eventId}`, identitySource: 'shopify_event_fallback' };
}

function tkfDeviceCategory(event, explicitValue = '') {
  const explicit = tkfSafeText(explicitValue, 40);
  if (explicit) return explicit;
  const userAgent = String(event.context?.navigator?.userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return 'tablet';
  if (/mobile|iphone|ipod|android/.test(userAgent)) return 'mobile';
  return 'desktop';
}

async function tkfSignalEventId(eventName, event, identity, fields) {
  const windowSeconds = eventName === 'page_view' ? 300 : eventName === 'global_click' ? 5 : 0;
  if (!windowSeconds) {
    return `shopify_${eventName}_${tkfSafeIdentifier(event.id, String(Date.now())).slice(0, 120)}`;
  }
  const occurredAt = Date.parse(event.timestamp || '');
  const bucket = Math.floor((Number.isFinite(occurredAt) ? occurredAt : Date.now()) / (windowSeconds * 1000));
  const signature = [
    identity.visitorId,
    eventName,
    fields.pagePath || tkfPagePath(event),
    fields.elementKey || '',
    fields.elementLabel || '',
    bucket,
  ].join('|');
  const signatureHash = await tkfSha256(signature);
  return `shopify_${eventName}_dedupe_${signatureHash.slice(0, 24)}_${bucket.toString(36)}`;
}

async function tkfSendSignal(eventName, event, fields = {}, metadata = {}, rawCustomerId = '') {
  const identity = tkfIdentity(event);
  const windowSeconds = eventName === 'page_view' ? 300 : eventName === 'global_click' ? 5 : 0;
  const customerIdHash = await tkfSha256(rawCustomerId || init?.data?.customer?.id || '');
  const signalEvent = {
    eventId: await tkfSignalEventId(eventName, event, identity, fields),
    visitorId: identity.visitorId,
    eventName,
    occurredAt: event.timestamp || new Date().toISOString(),
    pagePath: tkfSafeText(fields.pagePath || tkfPagePath(event), 2000) || '/',
    elementKey: tkfSafeText(fields.elementKey, 300),
    elementLabel: tkfSafeText(fields.elementLabel, 500),
    pageSection: tkfSafeText(fields.pageSection, 200),
    destinationPath: tkfSafeText(fields.destinationPath, 2000),
    clickTarget: tkfSafeText(fields.clickTarget, 120),
    deviceCategory: tkfDeviceCategory(event, fields.deviceCategory),
    metadata: {
      ...metadata,
      identitySource: identity.identitySource,
      ...(windowSeconds ? { dedupeWindowSeconds: windowSeconds } : {}),
    },
  };
  if (customerIdHash) signalEvent.customerIdHash = customerIdHash;
  await fetch(TKF_SIGNAL_EVENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ siteKey: 'tkf', source: 'shopify_pixel:tkf', event: signalEvent }),
    keepalive: true,
  });
}

analytics.subscribe('page_viewed', (event) => {
  tkfSendSignal('page_view', event, { pageSection: 'page', clickTarget: 'page_viewed' }).catch(() => {});
});

analytics.subscribe('product_added_to_cart', (event) => {
  const cartLine = event.data?.cartLine;
  const merchandise = cartLine?.merchandise || {};
  const price = Number(merchandise.price?.amount ?? merchandise.price ?? 0);
  const quantity = Number(cartLine?.quantity || 1);
  tkfSendSignal('add_to_cart', event, {
    elementKey: tkfSafeIdentifier(merchandise.sku || merchandise.id, 'product_item'),
    elementLabel: merchandise.product?.title || merchandise.title || '',
    pageSection: 'product',
    clickTarget: 'product_added_to_cart',
  }, {
    currency: merchandise.price?.currencyCode || '',
    value: Number.isFinite(price) ? price * quantity : 0,
    quantity,
  }).catch(() => {});
});

analytics.subscribe('checkout_started', (event) => {
  const checkout = event.data?.checkout;
  tkfSendSignal('begin_checkout', event, {
    pagePath: tkfPagePath(event, '/checkouts'),
    pageSection: 'checkout',
    clickTarget: 'checkout_started',
  }, {
    currency: checkout?.currencyCode || '',
    value: Number(checkout?.totalPrice?.amount || 0),
  }).catch(() => {});
});

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data?.checkout;
  if (!checkout) return;
  const lineItems = Array.isArray(checkout.lineItems) ? checkout.lineItems : [];
  const itemCount = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  tkfSha256(checkout.order?.id || '').then((orderIdHash) => tkfSendSignal('purchase', event, {
    pagePath: tkfPagePath(event, '/checkouts/thank-you'),
    pageSection: 'checkout',
    clickTarget: 'checkout_completed',
  }, {
    currency: checkout.currencyCode || '',
    value: Number(checkout.totalPrice?.amount || 0),
    itemCount,
    orderIdHash,
  }, checkout.order?.customer?.id || checkout.customer?.id || '')).catch(() => {});
});

analytics.subscribe('all_custom_events', (event) => {
  if (event.name !== 'tkf:global_click') return;
  const customData = event.customData || event.data || {};
  tkfSendSignal('global_click', event, {
    pagePath: customData.page_path || tkfPagePath(event),
    elementKey: customData.element_key,
    elementLabel: customData.element_label,
    pageSection: customData.page_section,
    destinationPath: customData.destination_path,
    clickTarget: customData.click_target,
    deviceCategory: customData.device_category,
  }).catch(() => {});
});
