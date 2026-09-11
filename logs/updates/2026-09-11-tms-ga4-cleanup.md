# 2026-09-11 TMS GA4 重复采集清理

## 本次目标

- 保留 TMS 正式 GA4 数据流 `G-6CCD7E5TD3`。
- 清理主题和 Shopify 客户事件中的重复 GA / GTM 加载。
- 修正 GA4 页面浏览和电商金额字段，避免重复计数与无效金额。

## 修改范围

- TMS 当前发布主题 `202754031950` 的 `layout/theme.liquid`。
- Shopify 客户事件自定义 Pixel `262930766`（Google Analytics）。
- 未修改数据分析面板的运行时代码和数据库结构。

## 调整内容

- 从发布主题移除直装 GA4 `G-HZHEK8V9FQ`。
- 从发布主题移除重复加载的 `GTM-WLQ2B9HW` 及其 noscript 代码；该容器仍由现有 Shopify 自定义 Pixel 加载。
- 保留 `G-6CCD7E5TD3` 为唯一主 GA4 数据流。
- 为 GA4 初始化增加 `send_page_view: false`，页面浏览仅由 Shopify `page_viewed` 事件发送一次。
- 页面浏览补充真实页面网址、标题和来源，避免记录成 Web Pixel 沙盒网址。
- 页面浏览、加购、开始结账和购买统一复用真实页面信息，避免电商事件归到 Web Pixel 沙盒路径。
- 加购金额改为数值金额，商品明细按 GA4 `items` 格式发送。
- 开始结账和完成购买的金额、税费、运费、优惠与商品数组统一转换为 GA4 可统计格式。

## 影响范围

- 新产生的 TMS GA4 事件使用 `G-6CCD7E5TD3`。
- 已经写入 GA4 的历史重复数据不会被自动删除。
- 其他 Meta、TikTok、Clarity、Matomo 与 Google Ads Pixel 未做改动。

## 自检

- Shopify 后台显示“像素已保存”。
- 首页真实网络请求只出现 1 次 `G-6CCD7E5TD3` 的 `page_view`，页面网址为 `https://mezkiraly.com/`。
- 商品页真实网络请求只出现 1 次 `page_view`，页面网址和标题均为真实商品页信息。
- 真实选择规格并加入测试浏览器购物车后，`add_to_cart` 返回 HTTP 204。
- 加购事件金额为 `29000`、币种为 `HUF`，不再出现 `[object Object]`。
- 加购商品包含变体 ID、商品名、规格 `S / S`、单价 `29000` 和数量 `1`。
- 加购事件页面地址为真实商品页（包含所选变体参数），不再是 Web Pixel 沙盒地址。
- 未观察到 `G-HZHEK8V9FQ` 请求；`GTM-WLQ2B9HW` 与 `GTM-5V3FLB7R` 仍由各自 Shopify Pixel 按原用途加载。

## 遗留问题

- 购买事件代码已保留并规范化，但不能通过测试链路制造真实订单；需由下一笔真实订单确认 GA4 `purchase` 最终数据。
- GA4 增强型衡量产生的滚动事件仍来自 Web Pixel 沙盒上下文，本次不调整该功能。
