# 购买快速通道 v2 上线交接

## 目的

把四个站点的购买事件改为立即发送，避免 Customer Pixel 在等待 SHA-256 时被结账页提前结束。此次只替换现有 Pixel 代码，不新建第二个 Pixel，不接 Shopify / SHOPLINE 订单回填。

## 文件对应关系

- TKF：`shopify/customer-pixels/tkf-signal-purchase-bridge.js`
- TMS：`shopify/customer-pixels/tms-ga4-customer-pixel.js`
- FKK：`shopify/customer-pixels/fkk-ga4-customer-pixel.js`
- BLK：`shopline/customer-events/blk-ga4-signal-pixel.js`

## 后台操作

1. 打开对应站点现有的 Customer Pixel / 客户事件。
2. 记录当前名称、隐私设置和连接状态。
3. 用对应文件全文替换旧代码；不要只复制购买函数，也不要保留两份订阅。
4. 保存；若状态变为未连接，重新连接。
5. 重新打开并回读，确认代码没有被截断。

## 保存后必须搜索

- `2026-09-18.purchase-fastpath-v2`
- `signal_purchase_attempt`
- `idempotencySource`
- `itemsTruncated`

同时确认 purchase 代码中不存在等待 `orderIdHash` 后才调用 Signal 的逻辑。原始订单号仍可作为 GA4 的 `transaction_id`，但不能进入 Signal 载荷。

## 技术验收

- Shopify 三站应保留 `page_viewed`、`product_added_to_cart`、`checkout_started`、`checkout_completed` 和自定义点击订阅。
- BLK 应保留 `page_viewed`、`product_added_to_cart`、`checkout_started`、`checkout_completed` 和 `blk_signal_click`。
- 接收地址均为 `https://multi-site-analytics.vercel.app/api/events`。
- 保存后状态为已连接。

## 真实业务验收

下一笔自然 Online Store 订单完成后，在相同时间窗口核对：

1. GA4 有且只有一条 `purchase`。
2. 用户行为中有且只有一条 `purchase`。
3. 商品、数量、金额和币种与平台订单一致。
4. 用户行为时间以店铺时区展示，底层仍保留 UTC。

只有四项都满足，才能把对应站点标记为购买闭环验收完成。历史缺失订单不从后台反向补录。
