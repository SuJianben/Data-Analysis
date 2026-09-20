import assert from 'node:assert/strict';
import { isOpaqueShopifyPixelRequest } from '../cloudflare/user-events/src/shopify-pixel-ingest.ts';
import { isOpaqueShoplineEventRequest } from '../cloudflare/user-events/src/shopline-pixel-ingest.ts';

const now = Date.parse('2026-09-15T03:00:00.000Z');
const request = new Request('https://fkk-signal-user-events.trustmereview.workers.dev/v1/events', {
  method: 'POST',
  headers: { Origin: 'null' },
});

function payload(event) {
  return { siteKey: 'fkk', source: 'shopify_pixel:fkk', events: [event] };
}

function baseEvent(eventName) {
  return {
    eventId: `shopify_${eventName}_event-12345678`,
    visitorId: 'shopify_client_client-12345678',
    eventName,
    occurredAt: '2026-09-15T02:59:00.000Z',
    pagePath: '/products/example',
    metadata: { identitySource: 'shopify_client_id' },
  };
}

assert.equal(isOpaqueShopifyPixelRequest(request, payload(baseEvent('page_view')), now), true);
assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  ...baseEvent('global_click'),
  elementKey: 'ProductSubmitButton',
  elementLabel: 'Add to cart',
}), now), true);
assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  ...baseEvent('purchase'),
  pagePath: '/checkouts/example/thank-you',
  pageSection: 'checkout',
  clickTarget: 'checkout_completed',
  metadata: {
    identitySource: 'shopify_client_id',
    currency: 'GBP',
    value: 53,
    itemCount: 2,
    items: [{ itemId: 'SKU-1', itemName: 'Fast shirt', quantity: 2 }],
    deliveryVersion: '2026-09-18.purchase-fastpath-v2',
    idempotencySource: 'shopify_event_id',
  },
}), now), true, '新版购买首包应使用 Shopify 事件 ID 去重，不再强制等待订单哈希。');
assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  ...baseEvent('purchase'),
  pagePath: '/checkouts/example/thank-you',
  pageSection: 'checkout',
  clickTarget: 'checkout_completed',
  metadata: { identitySource: 'shopify_client_id', currency: 'GBP', value: 53, itemCount: 2 },
}), now), false, '既无旧哈希又无新版商品证据的购买必须拒绝。');
assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  ...baseEvent('purchase'),
  pagePath: '/checkouts/example/thank-you',
  pageSection: 'checkout',
  clickTarget: 'checkout_completed',
  metadata: {
    identitySource: 'shopify_client_id',
    orderIdHash: 'a'.repeat(64),
    currency: 'GBP',
    value: 53,
    itemCount: 2,
  },
}), now), true);
assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  eventId: 'shopify_purchase_legacy-12345678',
  visitorId: 'visitor_shopify_legacy-12345678',
  eventName: 'purchase',
  occurredAt: '2026-09-15T02:59:00.000Z',
  pagePath: '/checkouts/example/thank-you',
  pageSection: 'checkout',
  clickTarget: 'checkout_completed',
  metadata: {
    orderIdHash: 'b'.repeat(64),
    currency: 'GBP',
    value: 41,
    itemCount: 1,
  },
}), now), true, '后台切换前产生的旧版购买事件必须继续兼容。');

assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  ...baseEvent('page_view'),
  visitorId: 'shopify_event_event-12345678',
}), now), false, 'identitySource 与 visitorId 来源不一致时必须拒绝。');
assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  ...baseEvent('purchase'),
  visitorId: 'shopify_event_event-12345678',
  pagePath: '/checkouts/example/thank-you',
  pageSection: 'checkout',
  clickTarget: 'checkout_completed',
  metadata: {
    identitySource: 'shopify_client_id',
    orderIdHash: 'c'.repeat(64),
    currency: 'GBP',
    value: 53,
    itemCount: 2,
  },
}), now), false, '新版购买事件也必须严格匹配 identitySource 与 visitorId。');
assert.equal(isOpaqueShopifyPixelRequest(request, {
  ...payload(baseEvent('page_view')),
  source: 'shopify_pixel:tms',
}, now), false, '站点与来源不匹配时必须拒绝。');
assert.equal(isOpaqueShopifyPixelRequest(request, payload({
  ...baseEvent('global_click'),
  elementKey: '',
  elementLabel: '',
}), now), false, '无元素语义的全局点击必须拒绝。');

const shoplineRequest = new Request('https://blk-signal-user-events.trustmereview.workers.dev/v1/events', {
  method: 'POST',
  headers: { Origin: 'null' },
});
const shoplineEvent = {
  eventId: 'shopline_purchase_event-12345678',
  visitorId: 'visitor_shopline_client-12345678',
  eventName: 'purchase',
  occurredAt: '2026-09-15T02:59:00.000Z',
  pagePath: '/checkouts/example/thank-you',
  pageSection: 'checkout',
  clickTarget: 'checkout_completed',
  metadata: {
    identitySource: 'shopline_client_id',
    currency: 'EUR',
    value: 88,
    itemCount: 1,
    items: [{ itemId: 'BLK-1', itemName: 'Fast shirt', quantity: 1 }],
    deliveryVersion: '2026-09-18.purchase-fastpath-v2',
    idempotencySource: 'shopline_event_id',
  },
};
const shoplinePayload = { siteKey: 'blk', source: 'shopline_pixel:blk', events: [shoplineEvent] };
assert.equal(
  isOpaqueShoplineEventRequest(shoplineRequest, shoplinePayload, now),
  true,
  'SHOPLINE 新版购买首包应使用平台事件 ID 和商品证据通过校验。',
);
assert.equal(
  isOpaqueShoplineEventRequest(shoplineRequest, {
    ...shoplinePayload,
    events: [{ ...shoplineEvent, metadata: { currency: 'EUR', value: 88, itemCount: 1 } }],
  }, now),
  false,
  'SHOPLINE 购买缺少旧哈希和新版商品证据时必须拒绝。',
);

console.log('Shopify/SHOPLINE Pixel 隔离来源校验通过：新旧购买链路放行，伪造或不完整载荷拒绝。');
