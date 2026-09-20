# BLK SHOPLINE 埋点接入交接

## 接入目标

将 Belgiumkits（BLK）接入多站点数据分析面板，并沿用现有 GA4 数据源。不要新建第二个 GA 客户事件，也不要从 SHOPLINE 订单反向补写埋点购买。

## 固定配置

- 站点简称：BLK
- 正式域名：`https://belgiumkits.com`
- GA4 媒体资源 ID：`550705698`
- GA4 衡量 ID：`G-TRCFQDSHYR`
- 用户行为接收地址：`https://multi-site-analytics.vercel.app/api/events`
- 当前购买协议：`2026-09-18.purchase-fastpath-v2`

## 第一步：替换现有 Google_Analytic 客户事件

请同时把本文档和 `shopline/customer-events/blk-ga4-signal-pixel.js` 交给执行人或 Codex。

1. 打开 SHOPLINE 后台“设置 → 客户事件”。
2. 打开现有 `Google_Analytic`，不要创建第二个事件。
3. 用附件 `blk-ga4-signal-pixel.js` 全文替换编辑器旧代码，不要只复制购买函数。
4. 保存并保持连接状态。
5. 重新打开并回读，确认代码没有被截断。

保存后搜索并确认：

- 只有 `G-TRCFQDSHYR`，没有其他 `G-` 衡量 ID。
- 存在 `2026-09-18.purchase-fastpath-v2`。
- 存在 `signal_purchase_attempt`、`idempotencySource` 和 `itemsTruncated`。
- 接收地址为 `https://multi-site-analytics.vercel.app/api/events`。
- 载荷是 `siteKey: "blk"` 和 `source: "shopline_pixel:blk"`。
- 存在 `page_viewed`、`product_added_to_cart`、`checkout_started`、`checkout_completed` 和 `blk_signal_click` 五个订阅。

新版购买回调会先发 Signal，再执行 GA4 purchase；Signal 载荷只包含平台事件号、匿名访客号、金额、币种、商品数量和精简商品信息，不发送原始订单号或客户号。

## 第二步：确认店铺页面发布器

此项已通过 SHOPLINE Script Tag 安装，不要重复新增脚本。

- Script Tag ID：`6aa8a367320c026a3e51e018`
- 正式脚本：`https://multi-site-analytics.vercel.app/integrations/shopline/blk-signal-publisher.js`
- 作用范围：全部页面
- 加载事件：`onload`

该脚本负责在用户允许追踪后采集菜单和全局点击，并通过 SHOPLINE 自定义事件交给客户事件 Pixel。

## 第三步：核对 GA4 自定义维度

在 GA4“管理 → 自定义定义”中核对以下事件范围维度；已有维度不要重复创建：

- `menu_name`
- `menu_key`
- `parent_menu_name`
- `menu_level`
- `menu_action`
- `click_target`
- `element_key`
- `element_label`
- `page_section`
- `destination_path`
- `heatmap_cell`
- `element_group`

## 验收流程

1. 在无痕窗口打开 `https://belgiumkits.com`，同意统计类 Cookie。
2. 浏览两个页面，点击一次主菜单、一个商品入口和一次加入购物车。
3. 在 GA4 实时报告确认页面、点击和加购事件出现。
4. 在数据面板切换到 BLK，确认只展示 BLK 数据。
5. 下一笔自然订单完成后，核对 SHOPLINE 订单、GA4 `purchase` 和用户行为 `purchase` 的时间、金额、币种、商品和次数。

只有第 5 项通过，才能把购买闭环标记为验收完成。`checkout_completed` 仍受 SHOPLINE 是否触发该客户事件的上游平台边界影响，历史缺失订单不倒灌。

## 执行边界

- 不访问或导出客户、订单、付款等敏感数据。
- 不把 SHOPLINE Admin Token、客户隐私数据或原始订单号写进脚本和文档。
- 不重复安装 Google 应用、GTM、客户事件或页面发布器。
- 如果后台名称、衡量 ID或连接状态与本文不一致，立即停止并反馈，不要猜测修改。
