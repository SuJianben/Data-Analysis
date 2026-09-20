# DTK SHOPLINE 客户事件接入交接

## 固定配置

- 站点：Deintrikot（DTK）
- 正式域名：`https://deintrikot.at`
- SHOPLINE 域名：`https://deintrikot.myshopline.com`
- GA4 媒体资源 ID：`553124485`
- GA4 衡量 ID：`G-2YN8WS6N3E`
- Signal 接收地址：`https://multi-site-analytics.vercel.app/api/events`
- 客户事件文件：`shopline/customer-events/dtk-ga4-signal-pixel.js`

## 后台实际状态

- 2026-09-18 已创建并连接自定义像素 `DTK Signal GA4`。
- 后台连接后的操作入口显示为“断开连接”。
- 编辑器回读内容与 `shopline/customer-events/dtk-ga4-signal-pixel.js` 一致。
- 回读 SHA-256：`46bac51c677ca27f95304fd0c282649c52328a815fb8d625e18e2dc95399fbfe`。

后续修改后仍必须回读确认：

- 只有 `G-2YN8WS6N3E`。
- 载荷为 `siteKey: "dtk"` 和 `source: "shopline_pixel:dtk"`。
- 订阅 `page_viewed`、`product_added_to_cart`、`checkout_started`、`checkout_completed` 和 `dtk_signal_click`。
- 存在 `2026-09-18.purchase-fastpath-v2`、`signal_purchase_attempt` 和 `idempotencySource`。

## 前台发布器状态

- Script Tag 已创建，ID：`6aacf9554996e0681ab404e0`
- 托管脚本：`https://multi-site-analytics.vercel.app/integrations/shopline/dtk-signal-publisher.js`
- 作用范围：全部页面；加载时机：`onload`
- 2026-09-18 当前主题预览已确认发布器只加载 1 份。
- 主题管理页确认 `Fashion 2026/09/18` 为已发布主题；正式域名当时仍命中旧页面缓存，缓存传播后必须再次确认正式页面也只有 1 个发布器入口。
- `shopline/custom-code/dtk-signal-publisher.js` 仅作为回退加载器保留，当前未启用，禁止与 Script Tag 同时使用。

## 旧主题 GA 清理边界

当前发布主题 `Fashion 2026/09/18` 的 `layout/theme.html` 已删除旧 GA 和按钮文字推测代码。主题预览实测旧 GA 为 0 份、旧文字推测代码为 0 份；GA4 电商事件和 Signal 事件由已连接的客户事件负责。

## 待办与验收

- Google OAuth 项目尚未启用 Analytics Admin API，12 个事件级自定义维度暂时无法自动检查或补齐。
- 2026-09-18 已在正式店铺验证 `page_view`、`global_click` 和 `add_to_cart` 可经 Vercel 队列进入本地 SQLite；15 条验收测试记录已清理并重发快照。
- `begin_checkout` 尚未单独验收。
- 下一笔自然订单要同时核对 SHOPLINE、GA4 `purchase` 和用户行为 `purchase` 的时间、金额、币种、商品和次数。
- 上述购买验证通过前，DTK 不能标记为购买闭环完成。
