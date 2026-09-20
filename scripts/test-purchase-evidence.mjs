import assert from 'node:assert/strict';
import { purchaseEvidence } from '../src/features/users/purchase-evidence.ts';

function event(overrides) {
  return {
    eventId: overrides.eventId,
    visitorId: 'shopify_client_test-visitor',
    customerIdHash: 'customer-hash',
    eventName: overrides.eventName,
    occurredAt: overrides.occurredAt,
    pagePath: '/checkouts/example',
    elementLabel: overrides.elementLabel || '',
    pageSection: overrides.pageSection || '',
    deviceCategory: 'mobile',
    metadata: overrides.metadata || {},
    receivedAt: overrides.receivedAt || overrides.occurredAt,
  };
}

const rows = [
  event({
    eventId: 'purchase-1',
    eventName: 'purchase',
    occurredAt: '2026-09-16T19:20:34.000Z',
    receivedAt: '2026-09-16T19:20:35.000Z',
    pageSection: 'checkout',
    metadata: { currency: 'HUF', value: 19150, itemCount: 2, orderIdHash: 'a'.repeat(64) },
  }),
  event({ eventId: 'checkout-1', eventName: 'begin_checkout', occurredAt: '2026-09-16T19:19:48.000Z', pageSection: 'checkout' }),
  event({ eventId: 'cart-2', eventName: 'add_to_cart', occurredAt: '2026-09-16T19:19:44.000Z', elementLabel: 'Delivery Insurance' }),
  event({ eventId: 'cart-1', eventName: 'add_to_cart', occurredAt: '2026-09-16T19:19:34.000Z', elementLabel: 'LUIS DÍAZ #7 Shirt' }),
];

const historicalEvidence = purchaseEvidence(rows[0], rows);
assert.equal(historicalEvidence.status, 'complete');
assert.match(historicalEvidence.primaryText, /LUIS DÍAZ #7 Shirt/);
assert.match(historicalEvidence.primaryText, /Delivery Insurance/);
assert.match(historicalEvidence.secondaryText, /HUF\s*19,150/);
assert.match(historicalEvidence.secondaryText, /2 件/);
assert.match(historicalEvidence.secondaryText, /加购→结账→购买/);
assert.match(historicalEvidence.explanation, /加购链路/);

const enrichedPurchase = event({
  eventId: 'purchase-2',
  eventName: 'purchase',
  occurredAt: '2026-09-16T20:20:34.000Z',
  metadata: {
    currency: 'GBP',
    value: 79,
    itemCount: 1,
    orderIdHash: 'b'.repeat(64),
    items: [{ itemId: 'SKU-1', itemName: 'Retro shirt', itemVariant: 'M', quantity: 1, price: 79 }],
  },
});
const enrichedRows = [
  enrichedPurchase,
  event({ eventId: 'checkout-2', eventName: 'begin_checkout', occurredAt: '2026-09-16T20:19:48.000Z' }),
  event({ eventId: 'cart-3', eventName: 'add_to_cart', occurredAt: '2026-09-16T20:19:34.000Z', elementLabel: 'Retro shirt' }),
  ...rows,
];
const enrichedEvidence = purchaseEvidence(enrichedPurchase, enrichedRows);
assert.equal(enrichedEvidence.status, 'complete');
assert.equal(enrichedEvidence.primaryText, 'Retro shirt · M');
assert.match(enrichedEvidence.explanation, /购买事件/);
assert.equal(enrichedEvidence.primaryText.includes('Delivery Insurance'), false, '新购买不应混入上一笔购买的加购商品。');

const partialPurchase = event({ eventId: 'purchase-3', eventName: 'purchase', occurredAt: '2026-09-16T21:00:00.000Z' });
const partialEvidence = purchaseEvidence(partialPurchase, [partialPurchase]);
assert.equal(partialEvidence.status, 'partial');
assert.match(partialEvidence.explanation, /金额或币种/);

const duplicatePurchase = event({
  eventId: 'purchase-4',
  eventName: 'purchase',
  occurredAt: '2026-09-16T22:00:00.000Z',
  metadata: { orderIdHash: 'c'.repeat(64) },
});
const duplicateCopy = event({
  eventId: 'purchase-5',
  eventName: 'purchase',
  occurredAt: '2026-09-16T22:00:01.000Z',
  metadata: { orderIdHash: 'c'.repeat(64) },
});
assert.equal(purchaseEvidence(duplicatePurchase, [duplicatePurchase, duplicateCopy]).status, 'review');

console.log('购买证据规则验证通过：兼容历史记录、新商品字段、缺失字段和重复购买。');
