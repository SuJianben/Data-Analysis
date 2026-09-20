# 2026-09-17 独立购买证据展示优化

## 本次目标

- 不接入 Shopify 或 SHOPLINE 订单数据，不补写历史购买，只增强 Signal 前端埋点自身的可核验证据。
- 让用户先从 Signal 发现购买，再独立到电商后台核对时间、商品、金额和件数。

## 修改范围

- `src/features/users/purchase-evidence.ts`
- `src/components/users/user-event-table.tsx`
- `src/app/globals.css`
- `shopify/customer-pixels/tkf-signal-purchase-bridge.js`
- `shopify/customer-pixels/tms-ga4-customer-pixel.js`
- `shopify/customer-pixels/fkk-ga4-customer-pixel.js`
- `shopline/customer-events/blk-ga4-signal-pixel.js`
- `scripts/test-purchase-evidence.mjs`
- `scripts/test-shopify-signal-identity.mjs`
- `scripts/test-signal-delivery-retry.mjs`
- `package.json`

## 新增与调整

- 购买行直接显示币种、金额、件数和“加购→结账→购买”链路。
- 历史购买没有商品明细时，仅在同一访客、同一购买分段、6 小时内从加购事件提取商品，并明确标记为“商品来自加购链路”。
- 新购买埋点最多携带 12 个脱敏商品字段：商品编号、名称、规格、价格和数量。
- 保留订单 SHA-256 哈希，不发送原始订单号、客户姓名、邮箱、电话或地址。
- 增加“链路完整”、“部分证据”和“需核查”状态；重复订单哈希或超过 5 分钟入库延迟会标记为需核查。

## 影响范围

- 面板只解释 Signal 已采集数据，不会把电商后台订单混入埋点。
- 旧数据字段缺失时保持兼容，不伪造商品明细。
- 商品字段只增加单次购买请求体大小，不增加 Worker 或 D1 写入次数。

## 发布状态

- 面板已发布到 Vercel 正式域名 `https://tkf-signal.vercel.app`。
- 四站像素源码已完成，但未通过平台后台替换；在各站客户事件后台发布前，新购买仍会由面板尽量从加购链路提取商品证据。

## 自检

- `npm run test:tracking`：通过，四站购买字段、失败重试和身份隔离均正常。
- `npm run test:worker-ingest`：通过。
- `npm run test:blk-filter`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- 本地生产页面验证了历史购买和增强购买两种数据结构。
- 线上 TMS 真实购买链已回查：正确显示 `2026/9/17 03:20:34`、`HUF 19,150`、`2 件`、两个加购商品和“链路完整”。

## 遗留问题

- 需在 TKF、TMS、FKK 的 Shopify Customer Pixel 与 BLK 的 SHOPLINE Customer Events 后台发布对应像素源码，未发布前不会从购买事件直接获得商品明细。
- 拒绝统计 Cookie 的用户仍可能不会启动像素；本次没有绕过用户同意。
