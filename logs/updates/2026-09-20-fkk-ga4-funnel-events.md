# 2026-09-20 FKK GA4 电商漏斗事件补全

## 本次目标

- 在现有 FKK Shopify Customer Pixel 中补充商品浏览、配送信息和支付信息三个 GA4 漏斗事件。
- 保留原有 Signal 用户行为、购买快速通道、去重和重试逻辑。

## 修改范围

- `shopify/customer-pixels/fkk-ga4-customer-pixel.js`：新增 `product_viewed → view_item`、`checkout_shipping_info_submitted → add_shipping_info`、`payment_info_submitted → add_payment_info`。
- `scripts/test-fkk-shopify-signal.mjs`：增加新事件的金额、币种、商品、优惠码和配送方式断言。
- `docs/handoffs/FKK-Customer-Pixel-Codex操作交接.md`：将验收清单从五个订阅更新为八个订阅。

## 影响范围

- 三个新事件仅发送至 GA4，不写入 Signal、本地 SQLite 或 Cloudflare。
- 原有 `page_view`、`add_to_cart`、`begin_checkout`、`purchase` 的事件名和发送逻辑不变。
- 历史数据不回补，只影响 Shopify 后台保存并连接新代码后的新行为。

## 自检与遗留问题

- Pixel 语法检查通过。
- FKK 完整链路模拟通过：三个新 GA4 事件的币种、金额、商品、优惠码和配送方式映射正确，Signal 仍仅生成原有五类事件。
- 五站购买快速通道与 Signal 503 重试回归验证通过。
- 主项目 TypeScript 检查通过。
- Shopify 正式店铺仍需保存合并后的 Pixel 代码，并用 Pixel Helper 或后续真实行为做线上验收。
- `purchase` 漏采问题未因本次漏斗事件补充而自动解决，仍需单独验证 `checkout_completed` 触发与隐私权限。
