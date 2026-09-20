import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const pixels = [
  {
    site: 'tkf',
    path: '../shopify/customer-pixels/tkf-signal-purchase-bridge.js',
    customEvent: 'tkf:global_click',
    source: 'shopify_pixel:tkf',
  },
  {
    site: 'tms',
    path: '../shopify/customer-pixels/tms-ga4-customer-pixel.js',
    customEvent: 'tms:global_click',
    source: 'shopify_pixel:tms',
  },
  {
    site: 'fkk',
    path: '../shopify/customer-pixels/fkk-ga4-customer-pixel.js',
    customEvent: 'fkk:global_click',
    source: 'shopify_pixel:fkk',
  },
];

function eventContext(pathname) {
  return {
    document: {
      location: { href: `https://example.com${pathname}`, pathname },
      title: 'Signal identity test',
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

async function runPixelTest(pixel) {
  const source = await readFile(new URL(pixel.path, import.meta.url), 'utf8');
  const subscriptions = new Map();
  const requests = [];
  const context = {
    analytics: { subscribe: (name, callback) => subscriptions.set(name, callback) },
    init: { data: { customer: { id: 'customer-identity-test' } } },
    document: {
      createElement: () => ({ setAttribute() {} }),
      head: { appendChild() {} },
    },
    fetch: async (url, options) => {
      requests.push({ url, payload: JSON.parse(options.body) });
      return { ok: true };
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
    Math,
    console,
    setTimeout,
  };
  context.window = context;
  context.dataLayer = [];
  vm.createContext(context);
  vm.runInContext(source, context, { filename: pixel.path });

  const clientId = 'client-unified-12345';
  const base = { clientId, context: eventContext('/products/example-shirt') };
  subscriptions.get('page_viewed')({ ...base, id: 'page-event-0001', timestamp: '2026-09-15T01:00:00.000Z', data: {} });
  subscriptions.get('page_viewed')({ ...base, id: 'page-event-0002', timestamp: '2026-09-15T01:00:01.000Z', data: {} });
  const clickData = {
    ga4EventName: 'global_click',
    page_path: '/products/example-shirt',
    element_key: 'ProductSubmitButton',
    element_label: 'Add to cart',
    page_section: 'main',
    destination_path: '',
    click_target: 'button',
    device_category: 'mobile',
  };
  subscriptions.get('all_custom_events')({
    ...base,
    id: 'click-event-0001',
    name: pixel.customEvent,
    timestamp: '2026-09-15T01:00:02.000Z',
    customData: clickData,
  });
  subscriptions.get('all_custom_events')({
    ...base,
    id: 'click-event-0002',
    name: pixel.customEvent,
    timestamp: '2026-09-15T01:00:03.000Z',
    customData: clickData,
  });
  subscriptions.get('product_added_to_cart')({
    ...base,
    id: 'cart-event-00001',
    timestamp: '2026-09-15T01:00:04.000Z',
    data: { cartLine: { quantity: 1, merchandise: { id: 'variant-77', sku: 'SKU-77', title: 'M', product: { title: 'Example shirt' }, price: { amount: 20, currencyCode: 'GBP' } } } },
  });
  subscriptions.get('checkout_started')({
    ...base,
    id: 'checkout-event-1',
    timestamp: '2026-09-15T01:01:00.000Z',
    context: eventContext('/checkouts/example'),
    data: { checkout: { currencyCode: 'GBP', totalPrice: { amount: 20 }, lineItems: [] } },
  });
  subscriptions.get('checkout_completed')({
    ...base,
    id: 'purchase-event-1',
    timestamp: '2026-09-15T01:02:00.000Z',
    context: eventContext('/checkouts/example/thank-you'),
    data: { checkout: {
      currencyCode: 'GBP',
      totalPrice: { amount: 20 },
      totalTax: { amount: 0 },
      shippingLine: { price: { amount: 0 } },
      discountApplications: [],
      order: { id: 'order-identity-test', customer: { id: 'customer-identity-test' } },
      lineItems: [{ quantity: 1, title: 'Example shirt', variant: { id: 'variant-77', sku: 'SKU-77', title: 'M', price: { amount: 20 } } }],
    } },
  });

  await waitFor(() => requests.length === 7, `${pixel.site} 没有产生预期的 7 条 Signal 请求。`);
  assert.ok(requests.every((request) => request.payload.siteKey === pixel.site));
  assert.ok(requests.every((request) => request.payload.source === pixel.source));
  const events = requests.map((request) => request.payload.event);
  assert.ok(events.every((event) => event.visitorId === `shopify_client_${clientId}`));
  assert.ok(events.every((event) => event.metadata.identitySource === 'shopify_client_id'));
  const pageViews = events.filter((event) => event.eventName === 'page_view');
  const clicks = events.filter((event) => event.eventName === 'global_click');
  const addToCart = events.find((event) => event.eventName === 'add_to_cart');
  const beginCheckout = events.find((event) => event.eventName === 'begin_checkout');
  const purchase = events.find((event) => event.eventName === 'purchase');
  assert.equal(pageViews.length, 2);
  assert.equal(clicks.length, 2);
  assert.equal(pageViews[0].eventId, pageViews[1].eventId, `${pixel.site} 页面浏览没有按 5 分钟窗口去重。`);
  assert.equal(clicks[0].eventId, clicks[1].eventId, `${pixel.site} 点击没有按 5 秒窗口去重。`);
  assert.equal(addToCart.eventId.includes('dedupe'), false, `${pixel.site} 加购不应被窗口去重。`);
  assert.equal(beginCheckout.eventId.includes('dedupe'), false, `${pixel.site} 开始结账不应被窗口去重。`);
  assert.equal(purchase.eventId.includes('dedupe'), false, `${pixel.site} 购买不应被窗口去重。`);
  assert.equal(purchase.customerIdHash, undefined, `${pixel.site} 购买首包不应等待客户哈希。`);
  assert.equal(purchase.metadata.orderIdHash, undefined, `${pixel.site} 购买首包不应等待订单哈希。`);
  assert.equal(purchase.metadata.deliveryVersion, '2026-09-18.purchase-fastpath-v2');
  assert.equal(purchase.metadata.idempotencySource, 'shopify_event_id');
  assert.equal(purchase.metadata.items.length, 1, `${pixel.site} 购买事件缺少商品证据。`);
  assert.equal(purchase.metadata.items[0].itemId, 'SKU-77');
  assert.equal(purchase.metadata.items[0].itemName, 'Example shirt');
  assert.equal(purchase.metadata.items[0].itemVariant, 'M');
  assert.equal(purchase.metadata.items[0].quantity, 1);
  assert.equal(purchase.metadata.itemsTruncated, false);
  assert.ok(JSON.stringify(purchase.metadata).length < 8_000, `${pixel.site} 购买证据超过 Worker metadata 限制。`);
  const serialized = JSON.stringify(requests.map((request) => request.payload));
  assert.equal(serialized.includes('customer-identity-test'), false, `${pixel.site} 载荷泄露原始客户 ID。`);
  assert.equal(serialized.includes('order-identity-test'), false, `${pixel.site} 载荷泄露原始订单 ID。`);
}

for (const pixel of pixels) await runPixelTest(pixel);

console.log('Shopify 三站身份与减压策略验证通过：clientId 统一，低价值事件窗口去重，购买首包不等待哈希。');
