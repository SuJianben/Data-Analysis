import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sites = [
  { key: 'blk', measurementId: 'G-TRCFQDSHYR' },
  { key: 'dtk', measurementId: 'G-2YN8WS6N3E' },
];

for (const site of sites) {
  const pixel = await readFile(new URL(`../shopline/customer-events/${site.key}-ga4-signal-pixel.js`, import.meta.url), 'utf8');
  const publisher = await readFile(new URL(`../public/integrations/shopline/${site.key}-signal-publisher.js`, import.meta.url), 'utf8');
  const loader = await readFile(new URL(`../shopline/custom-code/${site.key}-signal-publisher.js`, import.meta.url), 'utf8');
  const eventName = `${site.key}_signal_click`;

  assert.match(pixel, new RegExp(`GA4_MEASUREMENT_ID = "${site.measurementId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}"`));
  assert.match(pixel, new RegExp(`analytics\\.subscribe\\("${eventName}"`));
  assert.match(pixel, new RegExp(`siteKey: "${site.key}"`));
  assert.match(pixel, new RegExp(`source: "shopline_pixel:${site.key}"`));
  assert.match(publisher, new RegExp(`publish\\("${eventName}"`));
  assert.match(loader, new RegExp(`/integrations/shopline/${site.key}-signal-publisher\\.js`));
}

console.log('SHOPLINE 发布器契约验证通过：BLK/DTK 客户事件、托管脚本与加载器命名一致。');
