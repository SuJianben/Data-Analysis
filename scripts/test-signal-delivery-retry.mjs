import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const shopifyPixels = [
  ['tkf', '../shopify/customer-pixels/tkf-signal-purchase-bridge.js'],
  ['tms', '../shopify/customer-pixels/tms-ga4-customer-pixel.js'],
  ['fkk', '../shopify/customer-pixels/fkk-ga4-customer-pixel.js'],
];

async function waitFor(check, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(message);
}

function isDiagnostic(entry) {
  const values = Array.from(entry);
  return values[0] === 'event' && values[1] === 'signal_delivery_error';
}

function response(status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ code: status === 503 ? 'storage_temporarily_unavailable' : 'test_error' }),
  };
}

function commonContext(source, statuses) {
  const subscriptions = new Map();
  const requests = [];
  const dataLayer = [];
  const warnings = [];
  const pendingStatuses = [...statuses];
  const context = {
    analytics: { subscribe: (name, callback) => subscriptions.set(name, callback) },
    init: { data: { customer: { id: 'customer-retry-test' } } },
    document: { createElement: () => ({ setAttribute() {} }), head: { appendChild() {} } },
    fetch: async (url, options) => {
      requests.push({ url, payload: JSON.parse(options.body) });
      return response(pendingStatuses.length ? pendingStatuses.shift() : 200);
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
    console: { ...console, warn: (...args) => warnings.push(args) },
    setTimeout: (callback) => setTimeout(callback, 0),
    dataLayer,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { subscriptions, requests, dataLayer, warnings };
}

function shopifyPurchaseEvent(id) {
  return {
    id,
    clientId: 'client-retry-12345',
    timestamp: '2026-09-16T04:00:00.000Z',
    context: {
      document: {
        location: { href: 'https://example.com/checkouts/test/thank-you', pathname: '/checkouts/test/thank-you' },
        title: 'Thank you',
        referrer: '',
      },
      navigator: { userAgent: 'Mozilla/5.0 Mobile' },
    },
    data: { checkout: {
      currencyCode: 'GBP',
      totalPrice: { amount: 79 },
      totalTax: { amount: 0 },
      shippingLine: { price: { amount: 0 } },
      discountApplications: [],
      order: { id: `order-${id}`, customer: { id: 'customer-retry-test' } },
      lineItems: [{ quantity: 1, title: 'Retry shirt', variant: { id: 'variant-retry', sku: 'RETRY-1', title: 'M', price: { amount: 79 } } }],
    } },
  };
}

async function verifyShopifyPixel(site, path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const recovered = commonContext(source, [503, 503, 200]);
  recovered.subscriptions.get('checkout_completed')(shopifyPurchaseEvent(`${site}-recovered`));
  await waitFor(() => recovered.requests.length === 3, `${site} purchase 没有在 503 后重试成功。`);
  assert.equal(new Set(recovered.requests.map((request) => request.payload.event.eventId)).size, 1, `${site} 重试更换了事件号。`);
  assert.equal(recovered.requests[0].payload.event.metadata.items[0].itemName, 'Retry shirt', `${site} 重试载荷丢失了商品证据。`);
  assert.equal(recovered.dataLayer.some(isDiagnostic), false, `${site} 重试成功后不应报告失败。`);

  const failed = commonContext(source, [503, 503, 503, 503]);
  failed.subscriptions.get('checkout_completed')(shopifyPurchaseEvent(`${site}-failed`));
  await waitFor(() => failed.dataLayer.some(isDiagnostic) || failed.warnings.length > 0, `${site} 最终失败后没有产生诊断。`);
  assert.equal(failed.requests.length, 4, `${site} purchase 重试次数不正确。`);
  assert.equal(new Set(failed.requests.map((request) => request.payload.event.eventId)).size, 1, `${site} 失败重试更换了事件号。`);
}

for (const [site, path] of shopifyPixels) await verifyShopifyPixel(site, path);

function shoplinePurchaseEvent(id, domain, sku) {
  return {
    id,
    clientId: 'shopline-client-retry-12345',
    timestamp: Date.parse('2026-09-16T04:00:00.000Z'),
    context: {
      document: { location: { href: `https://${domain}/checkouts/thank-you`, pathname: '/checkouts/thank-you' }, title: 'Thank you', referrer: '' },
      navigator: { userAgent: 'Mozilla/5.0 Mobile' },
    },
    data: {
      orderSeq: `order-${id}`,
      customer_id: 'shopline-customer-retry',
      currency: 'EUR',
      value: 89,
      list: [{ skuItemNo: sku, title: 'Retry shirt', final_price: 89, quantity: 1 }],
      checkout: { order: { currency_code: 'EUR', total_price: 89, shipping_price: 0 } },
    },
  };
}

async function verifyShoplinePixel(site, path, domain) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const recovered = commonContext(source, [503, 200]);
  recovered.subscriptions.get('checkout_completed')(shoplinePurchaseEvent(`${site}-recovered`, domain, `${site.toUpperCase()}-RETRY`));
  await waitFor(() => recovered.requests.length === 2, `${site} purchase 没有在 503 后重试成功。`);
  assert.equal(new Set(recovered.requests.map((request) => request.payload.event.eventId)).size, 1, `${site} 重试更换了事件号。`);
  assert.equal(recovered.requests[0].payload.event.metadata.items[0].itemName, 'Retry shirt', `${site} 重试载荷丢失了商品证据。`);
  assert.equal(recovered.requests[0].payload.siteKey, site);
  assert.equal(recovered.dataLayer.some(isDiagnostic), false, `${site} 重试成功后不应报告失败。`);

  const failed = commonContext(source, [503, 503, 503, 503]);
  failed.subscriptions.get('checkout_completed')(shoplinePurchaseEvent(`${site}-failed`, domain, `${site.toUpperCase()}-RETRY`));
  await waitFor(() => failed.dataLayer.some(isDiagnostic), `${site} 最终失败后没有产生 GA4 诊断。`);
  assert.equal(failed.requests.length, 4, `${site} purchase 重试次数不正确。`);
  assert.equal(new Set(failed.requests.map((request) => request.payload.event.eventId)).size, 1, `${site} 失败重试更换了事件号。`);
}

await verifyShoplinePixel('blk', '../shopline/customer-events/blk-ga4-signal-pixel.js', 'belgiumkits.com');
await verifyShoplinePixel('dtk', '../shopline/customer-events/dtk-ga4-signal-pixel.js', 'deintrikot.at');

console.log('五站 Signal 投递韧性验证通过：503 可恢复、purchase 事件号稳定、最终失败有诊断。');
