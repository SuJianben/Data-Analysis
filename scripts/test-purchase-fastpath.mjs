import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const pixels = [
  { site: 'tkf', path: '../shopify/customer-pixels/tkf-signal-purchase-bridge.js', kind: 'shopify' },
  { site: 'tms', path: '../shopify/customer-pixels/tms-ga4-customer-pixel.js', kind: 'shopify' },
  { site: 'fkk', path: '../shopify/customer-pixels/fkk-ga4-customer-pixel.js', kind: 'shopify' },
  { site: 'blk', path: '../shopline/customer-events/blk-ga4-signal-pixel.js', kind: 'shopline' },
  { site: 'dtk', path: '../shopline/customer-events/dtk-ga4-signal-pixel.js', kind: 'shopline' },
];

function contextFor(pathname) {
  return {
    document: { location: { href: `https://example.com${pathname}`, pathname }, title: 'Fast path', referrer: '' },
    navigator: { userAgent: 'Mozilla/5.0 Mobile' },
  };
}

function purchaseEvent(kind, site) {
  const common = {
    id: `${site}-purchase-fastpath-event`,
    clientId: `${site}-client-fastpath`,
    timestamp: kind === 'shopline' ? Date.parse('2026-09-18T03:00:00.000Z') : '2026-09-18T03:00:00.000Z',
    context: contextFor('/checkouts/thank-you'),
  };
  if (kind === 'shopline') {
    return {
      ...common,
      data: {
        orderSeq: 'raw-shopline-order-must-not-leak',
        customer_id: 'raw-shopline-customer-must-not-leak',
        currency: 'EUR',
        value: 88,
        list: [{ skuItemNo: 'BLK-FAST', title: 'Fast shirt', final_price: 88, quantity: 1 }],
        checkout: { order: { currency_code: 'EUR', total_price: 88 } },
      },
    };
  }
  return {
    ...common,
    data: { checkout: {
      currencyCode: 'GBP',
      totalPrice: { amount: 79 },
      totalTax: { amount: 0 },
      shippingLine: { price: { amount: 0 } },
      discountApplications: [],
      order: { id: 'raw-shopify-order-must-not-leak', customer: { id: 'raw-shopify-customer-must-not-leak' } },
      lineItems: [{ quantity: 1, title: 'Fast shirt', variant: { sku: 'FAST-1', title: 'M', price: { amount: 79 } } }],
    } },
  };
}

for (const pixel of pixels) {
  const source = await readFile(new URL(pixel.path, import.meta.url), 'utf8');
  const subscriptions = new Map();
  const requests = [];
  const neverResolvingCrypto = { subtle: { digest: () => new Promise(() => {}) } };
  const context = {
    analytics: { subscribe: (name, callback) => subscriptions.set(name, callback) },
    init: { data: { customer: { id: 'initial-customer' } } },
    document: { createElement: () => ({ setAttribute() {} }), head: { appendChild() {} } },
    fetch: (url, options) => {
      requests.push({ url, options, payload: JSON.parse(options.body) });
      return new Promise(() => {});
    },
    crypto: neverResolvingCrypto,
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

  subscriptions.get('checkout_completed')(purchaseEvent(pixel.kind, pixel.site));
  assert.equal(requests.length, 1, `${pixel.site} 购买请求没有在回调返回前立即发起。`);
  assert.equal(requests[0].options.keepalive, true, `${pixel.site} 购买请求没有启用 keepalive。`);
  const serialized = JSON.stringify(requests[0].payload);
  const event = requests[0].payload.event;
  assert.equal(requests[0].payload.siteKey, pixel.site);
  assert.equal(requests[0].payload.source, `${pixel.kind}_pixel:${pixel.site}`);
  assert.equal(event.eventName, 'purchase');
  assert.equal(event.metadata.deliveryVersion, '2026-09-18.purchase-fastpath-v2');
  assert.equal(event.metadata.orderIdHash, undefined);
  assert.ok(Array.isArray(event.metadata.items) && event.metadata.items.length === 1);
  assert.equal(serialized.includes('raw-shopify-order-must-not-leak'), false);
  assert.equal(serialized.includes('raw-shopify-customer-must-not-leak'), false);
  assert.equal(serialized.includes('raw-shopline-order-must-not-leak'), false);
  assert.equal(serialized.includes('raw-shopline-customer-must-not-leak'), false);
}

console.log('五站购买快速通道验证通过：即使 SHA-256 永不返回，purchase 也会在回调结束前立即发起 keepalive 请求。');
