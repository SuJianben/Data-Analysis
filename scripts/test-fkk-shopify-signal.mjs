import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const pixelSource = await readFile(new URL('../shopify/customer-pixels/fkk-ga4-customer-pixel.js', import.meta.url), 'utf8');
const clickCollectorSource = await readFile(new URL('../shopify/theme-assets/fkk-global-click.js', import.meta.url), 'utf8');

function eventContext(pathname) {
  return {
    document: {
      location: { href: `https://footballkituk.com${pathname}`, pathname },
      title: 'FKK tracking test',
      referrer: '',
    },
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile' },
  };
}

async function waitFor(check, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(message);
}

function createHarness(initialCustomerId = null, options = {}) {
  const subscriptions = new Map();
  const requests = [];
  const dataLayer = [];
  const responses = [...(options.responses || [])];
  const context = {
    analytics: { subscribe: (name, callback) => subscriptions.set(name, callback) },
    init: { data: { customer: initialCustomerId ? { id: initialCustomerId } : null } },
    document: {
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild() {} },
    },
    fetch: async (url, options) => {
      requests.push({ url, options, payload: JSON.parse(options.body) });
      const status = responses.length ? responses.shift() : 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => ({ code: status === 503 ? 'storage_temporarily_unavailable' : 'test_error' }),
      };
    },
    crypto: webcrypto,
    TextEncoder,
    Uint8Array,
    Date,
    Number,
    String,
    Array,
    Object,
    Promise,
    Set,
    console,
    setTimeout: options.immediateTimers ? (callback) => setTimeout(callback, 0) : setTimeout,
  };
  context.window = context;
  context.dataLayer = dataLayer;
  vm.createContext(context);
  vm.runInContext(pixelSource, context, { filename: 'fkk-ga4-customer-pixel.js' });
  return { subscriptions, requests, dataLayer };
}

const clientId = 'client-journey-12345';
const harness = createHarness();
const emit = (subscription, event) => harness.subscriptions.get(subscription)(event);

emit('page_viewed', {
  id: 'page-event-0001', clientId, timestamp: '2026-09-15T01:00:00.000Z',
  context: eventContext('/products/example-shirt'), data: {},
});
emit('all_custom_events', {
  id: 'click-event-0001', clientId, name: 'fkk:global_click', timestamp: '2026-09-15T01:00:05.000Z',
  context: eventContext('/products/example-shirt'),
  customData: {
    ga4EventName: 'global_click', page_path: '/products/example-shirt', element_key: 'ProductSubmitButton',
    element_label: 'Add to cart', page_section: 'main', destination_path: '', click_target: 'button', device_category: 'mobile',
  },
});
emit('product_added_to_cart', {
  id: 'cart-event-00001', clientId, timestamp: '2026-09-15T01:00:06.000Z',
  context: eventContext('/products/example-shirt'),
  data: { cartLine: { quantity: 2, merchandise: { id: 'variant-77', sku: 'FKK-77', title: 'M', product: { title: 'Example shirt' }, price: { amount: 20, currencyCode: 'GBP' } } } },
});
emit('checkout_started', {
  id: 'checkout-event-1', clientId, timestamp: '2026-09-15T01:01:00.000Z',
  context: eventContext('/checkouts/example'),
  data: { checkout: { currencyCode: 'GBP', totalPrice: { amount: 40 }, lineItems: [] } },
});
emit('checkout_completed', {
  id: 'purchase-event-1', clientId, timestamp: '2026-09-15T01:02:00.000Z',
  context: eventContext('/checkouts/example/thank-you'),
  data: { checkout: {
    currencyCode: 'GBP', totalPrice: { amount: 40 }, totalTax: { amount: 0 }, shippingLine: { price: { amount: 0 } },
    discountApplications: [], order: { id: 'order-9001', customer: { id: 'customer-42' } },
    lineItems: [{ quantity: 2, title: 'Example shirt', variant: { id: 'variant-77', sku: 'FKK-77', title: 'M', price: { amount: 20 } } }],
  } },
});

await waitFor(() => harness.requests.length === 5, '完整链路没有产生预期的 5 条 Signal 事件。');
const signalEvents = harness.requests.map((request) => request.payload.event);
assert.deepEqual(
  signalEvents.map((event) => event.eventName).sort(),
  ['page_view', 'global_click', 'add_to_cart', 'begin_checkout', 'purchase'].sort(),
);
assert.equal(new Set(signalEvents.map((event) => event.visitorId)).size, 1, '同一 Shopify clientId 被拆成多个访客。');
assert.ok(signalEvents.every((event) => event.visitorId === `shopify_client_${clientId}`));
assert.ok(signalEvents.every((event) => event.metadata.identitySource === 'shopify_client_id'));
const purchaseEvent = signalEvents.find((event) => event.eventName === 'purchase');
assert.equal(purchaseEvent.customerIdHash, undefined);
assert.equal(purchaseEvent.metadata.orderIdHash, undefined);
assert.equal(purchaseEvent.metadata.deliveryVersion, '2026-09-18.purchase-fastpath-v2');
assert.equal(purchaseEvent.metadata.idempotencySource, 'shopify_event_id');
assert.equal(purchaseEvent.metadata.itemCount, 2);
const serializedRequests = JSON.stringify(harness.requests.map((request) => request.payload));
assert.equal(serializedRequests.includes('customer-42'), false, 'Signal 载荷泄露了原始客户 ID。');
assert.equal(serializedRequests.includes('order-9001'), false, 'Signal 载荷泄露了原始订单 ID。');

const fallbackHarness = createHarness();
fallbackHarness.subscriptions.get('page_viewed')({
  id: 'fallback-event-1', clientId: '', timestamp: '2026-09-15T02:00:00.000Z',
  context: eventContext('/'), data: {},
});
await waitFor(() => fallbackHarness.requests.length === 1, 'clientId 缺失时没有产生兜底事件。');
const fallbackEvent = fallbackHarness.requests[0].payload.event;
assert.equal(fallbackEvent.visitorId, 'shopify_event_fallback-event-1');
assert.equal(fallbackEvent.metadata.identitySource, 'shopify_event_fallback');

const retryHarness = createHarness(null, { responses: [503, 503, 200], immediateTimers: true });
retryHarness.subscriptions.get('checkout_completed')({
  id: 'purchase-retry-1', clientId, timestamp: '2026-09-15T03:00:00.000Z',
  context: eventContext('/checkouts/retry/thank-you'),
  data: { checkout: {
    currencyCode: 'GBP', totalPrice: { amount: 50 }, totalTax: { amount: 0 }, shippingLine: { price: { amount: 0 } },
    discountApplications: [], order: { id: 'order-retry-1', customer: { id: 'customer-retry-1' } },
    lineItems: [{ quantity: 1, title: 'Retry shirt', variant: { id: 'variant-retry', sku: 'FKK-RETRY', title: 'L', price: { amount: 50 } } }],
  } },
});
await waitFor(() => retryHarness.requests.length === 3, '购买事件遇到 503 后没有按计划重试。');
assert.equal(new Set(retryHarness.requests.map((request) => request.payload.event.eventId)).size, 1, '购买重试必须复用同一事件号。');
assert.equal(
  retryHarness.dataLayer.some((entry) => entry[0] === 'event' && entry[1] === 'signal_delivery_error'),
  false,
  '重试成功后不应上报 Signal 投递失败。',
);

const failedHarness = createHarness(null, { responses: [503, 503, 503, 503], immediateTimers: true });
failedHarness.subscriptions.get('checkout_completed')({
  id: 'purchase-failed-1', clientId, timestamp: '2026-09-15T03:05:00.000Z',
  context: eventContext('/checkouts/failed/thank-you'),
  data: { checkout: {
    currencyCode: 'GBP', totalPrice: { amount: 60 }, totalTax: { amount: 0 }, shippingLine: { price: { amount: 0 } },
    discountApplications: [], order: { id: 'order-failed-1', customer: { id: 'customer-failed-1' } },
    lineItems: [{ quantity: 1, title: 'Failed shirt', variant: { id: 'variant-failed', sku: 'FKK-FAILED', title: 'XL', price: { amount: 60 } } }],
  } },
});
await waitFor(
  () => failedHarness.dataLayer.some((entry) => entry[0] === 'event' && entry[1] === 'signal_delivery_error'),
  '购买事件最终失败后没有向 GA4 写入独立诊断事件。',
);
assert.equal(failedHarness.requests.length, 4);

const clickHandlers = new Map();
const publishedEvents = [];
const actionable = {
  id: 'ProductSubmitButton',
  innerText: 'Add to cart',
  closest(selector) {
    if (selector === 'a, button, summary, [role=\'button\'], [aria-expanded], [data-track-id], [onclick]') return this;
    if (selector === 'header' || selector === 'button') return this;
    return null;
  },
  getAttribute(name) {
    if (name === 'aria-label') return 'Add to cart';
    return null;
  },
  querySelector() { return null; },
};
const clickContext = {
  document: { addEventListener: (name, handler) => clickHandlers.set(name, handler) },
  location: { href: 'https://footballkituk.com/products/example-shirt', pathname: '/products/example-shirt', host: 'footballkituk.com' },
  innerWidth: 390,
  Shopify: { analytics: { publish: (name, data) => publishedEvents.push({ name, data }) } },
  URL,
  Date,
  String,
  Object,
  setTimeout,
};
clickContext.window = clickContext;
vm.createContext(clickContext);
vm.runInContext(clickCollectorSource, clickContext, { filename: 'fkk-global-click.js' });
clickHandlers.get('click')({ target: actionable });
assert.deepEqual(publishedEvents.map((event) => event.name), ['fkk:global_click', 'fkk:header_navigation_click']);
assert.equal(publishedEvents[0].data.element_key, 'ProductSubmitButton');
assert.equal(publishedEvents[0].data.page_path, '/products/example-shirt');

console.log('FKK Shopify Signal 完整链路模拟通过：主题事件已发布，5 类事件共用 clientId，购买使用立即发送版本。');
