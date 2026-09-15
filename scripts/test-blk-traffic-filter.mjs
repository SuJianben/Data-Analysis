import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { applyEventWritePolicy } from '../cloudflare/user-events/src/event-write-policy.ts';
import { isAutomatedUserAgent, isGeneratedCollectionFilterPath } from '../cloudflare/user-events/src/traffic-filter.ts';

const pixelSource = await readFile(new URL('../shopline/customer-events/blk-ga4-signal-pixel.js', import.meta.url), 'utf8');

function workerPayload(pagePath, metadata = { identitySource: 'shopline_client_id' }) {
  return {
    siteKey: 'blk',
    source: 'shopline_pixel:blk',
    events: [{
      eventId: 'shopline_page_view_event-12345678',
      visitorId: 'visitor_shopline_client-12345678',
      eventName: 'page_view',
      occurredAt: '2026-09-15T06:00:00.000Z',
      pagePath,
      deviceCategory: 'desktop',
      metadata,
    }],
  };
}

assert.equal(isAutomatedUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
assert.equal(isAutomatedUserAgent('Mozilla/5.0 Chrome/140 Safari/537.36'), false);
assert.equal(isGeneratedCollectionFilterPath('/collections/ronaldo/blk-combo--team~France__season~1998'), true);
assert.equal(isGeneratedCollectionFilterPath('/fr/collections/lukaku/blk-team--France+blk-team--Italy'), true);
assert.equal(isGeneratedCollectionFilterPath('/collections/retro-football-shirts'), false);

const normalRequest = new Request('https://blk-signal-user-events.trustmereview.workers.dev/v1/events', {
  method: 'POST',
  headers: { 'user-agent': 'Mozilla/5.0 Chrome/140 Safari/537.36' },
});
assert.equal(applyEventWritePolicy(normalRequest, workerPayload('/products/example-shirt')).events.length, 1);
assert.deepEqual(
  applyEventWritePolicy(normalRequest, workerPayload('/collections/ronaldo/blk-combo--team~France')).reasons,
  { generated_collection_filter: 1 },
);
assert.deepEqual(
  applyEventWritePolicy(normalRequest, workerPayload('/', { identitySource: 'shopline_event_fallback' })).reasons,
  { unstable_page_identity: 1 },
);
const botRequest = new Request(normalRequest.url, { method: 'POST', headers: { 'user-agent': 'Googlebot/2.1' } });
assert.deepEqual(applyEventWritePolicy(botRequest, workerPayload('/')).reasons, { automated_user_agent: 1 });
const purchasePayload = workerPayload('/checkouts/thank-you');
purchasePayload.events[0] = {
  ...purchasePayload.events[0],
  eventId: 'shopline_purchase_order-12345678',
  eventName: 'purchase',
  pageSection: 'checkout',
  clickTarget: 'checkout_completed',
  metadata: { identitySource: 'shopline_event_fallback', orderIdHash: 'a'.repeat(64), currency: 'EUR', value: 99, itemCount: 1 },
};
assert.equal(applyEventWritePolicy(botRequest, purchasePayload).events.length, 1, '购买事件不能被页面浏览过滤规则拦截。');

const shopifyFallbackPayload = {
  siteKey: 'fkk',
  source: 'shopify_pixel:fkk',
  events: [{
    ...workerPayload('/products/example-shirt').events[0],
    eventId: 'shopify_page_view_fallback-12345678',
    visitorId: 'shopify_event_fallback-12345678',
    metadata: { identitySource: 'shopify_event_fallback' },
  }],
};
assert.deepEqual(
  applyEventWritePolicy(normalRequest, shopifyFallbackPayload).reasons,
  { unstable_page_identity: 1 },
  'Shopify 缺少 clientId 的低价值事件不应继续制造一次性访客。',
);
const shopifyPurchasePayload = {
  ...shopifyFallbackPayload,
  events: [{ ...shopifyFallbackPayload.events[0], eventName: 'purchase' }],
};
assert.equal(applyEventWritePolicy(botRequest, shopifyPurchasePayload).events.length, 1, '高价值购买事件始终保留。');

function createPixelHarness() {
  const subscriptions = new Map();
  const requests = [];
  const dataLayer = [];
  const context = {
    analytics: { subscribe: (name, callback) => subscriptions.set(name, callback) },
    document: { createElement: () => ({ setAttribute() {} }), head: { appendChild() {} } },
    window: null,
    dataLayer,
    fetch: async (url, options) => { requests.push({ url, payload: JSON.parse(options.body) }); return { ok: true }; },
    crypto: globalThis.crypto,
    TextEncoder,
    Uint8Array,
    Date,
    Number,
    String,
    Array,
    Object,
    Promise,
    console,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(pixelSource, context, { filename: 'blk-ga4-signal-pixel.js' });
  return { subscriptions, requests, dataLayer };
}

function pageEvent({ id, clientId = 'client-12345678', path = '/', userAgent = 'Mozilla/5.0 Chrome/140 Safari/537.36' }) {
  return {
    id,
    clientId,
    timestamp: '2026-09-15T06:00:00.000Z',
    data: { path, url: `https://example.com${path}`, title: 'BLK test' },
    context: { document: { location: { href: `https://example.com${path}`, pathname: path }, title: 'BLK test', referrer: '' }, navigator: { userAgent } },
  };
}

const harness = createPixelHarness();
const emitPage = (event) => harness.subscriptions.get('page_viewed')(event);
emitPage(pageEvent({ id: 'normal-event-1', path: '/products/example-shirt' }));
emitPage(pageEvent({ id: 'bot-event-0001', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }));
emitPage(pageEvent({ id: 'filter-event-1', path: '/collections/ronaldo/blk-combo--team~France' }));
emitPage(pageEvent({ id: 'fallback-event-1', clientId: '' }));

await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(harness.requests.length, 1, '只有正常商品页浏览应发送到 Signal。');
assert.equal(harness.requests[0].payload.event.pagePath, '/products/example-shirt');
assert.equal(harness.requests[0].payload.event.metadata.identitySource, 'shopline_client_id');
assert.equal(harness.dataLayer.filter((entry) => entry[0] === 'event' && entry[1] === 'page_view').length, 1, '异常页面浏览不应进入 GA4。');

console.log('BLK 流量过滤验证通过：正常页面保留，机器人、组合筛选页和不稳定访客页面浏览均被过滤。');
