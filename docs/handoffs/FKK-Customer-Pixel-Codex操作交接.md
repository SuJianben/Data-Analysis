# FKK Customer Pixel v2：交给 Codex 的操作文档

## 发送给 Codex 的材料

请同时上传以下两个文件：

- 本文档。
- `fkk-ga4-customer-pixel.js`。

消息正文明确发送：

> 请按照附件执行。我授权你在 FKK 的 Shopify 后台“设置 → 客户事件”中更新、保存并重新连接现有的 `FKK GA4` 自定义 Pixel。操作范围仅限客户事件配置，不要访问订单、客户、付款或其他敏感数据；完成后请验证状态并截图汇报。

## 一、目标

将 FKK 现有 Customer Pixel 更新为统一身份链路版本：

- 页面浏览、点击、加购、开始结账和购买统一使用 Shopify `clientId`。
- 点击事件由主题通过 Shopify Analytics 发布，再由 Customer Pixel 同时发往 GA4 和 FKK Signal。
- 购买首包使用 Shopify 事件号和精简商品证据立即发送，不等待订单或客户哈希，也不发送原始编号。
- `clientId` 异常缺失时明确标记兜底身份，供数据健康页面报警。

## 二、必须核对的信息

- Shopify 后台店铺标识：`fbed87-94`。
- 正式域名：`footballkituk.com`。
- GA4 媒体资源 ID：`553763610`。
- GA4 衡量 ID：`G-51EXGWMTDP`。
- FKK 用户行为接收地址：`https://multi-site-analytics.vercel.app/api/events`。
- Pixel 名称：`FKK GA4`。

如果后台 URL 不包含 `/store/fbed87-94/`，立即停止。

## 三、执行边界

- 只操作 `设置 → 客户事件 → 自定义像素`。
- 更新现有 `FKK GA4`，不要新建同名 Pixel。
- 不访问订单、客户、付款或结账记录。
- 不修改主题，不安装 Google 应用，不创建 GTM。
- 不添加其他 GA4 衡量 ID。
- 不把 Shopify Admin Token、账号或客户资料写进代码。

## 四、操作步骤

1. 打开 `https://admin.shopify.com/store/fbed87-94/settings/customer_events`。
2. 打开现有 `FKK GA4` 自定义 Pixel。
3. 记录当前隐私设置；除非代码保存要求，不修改隐私设置。
4. 用附件 `fkk-ga4-customer-pixel.js` 的全文替换编辑器中的旧代码。
5. 保存代码。
6. 如果保存后状态变成未连接，重新连接 Pixel。
7. 重新打开 Pixel 并回读，确认保存内容没有被截断。

## 五、保存后检查

在编辑器中搜索并确认：

- 只有 `G-51EXGWMTDP`，没有其他 `G-` 衡量 ID。
- 接收地址是 `https://multi-site-analytics.vercel.app/api/events`。
- 存在 `2026-09-18.purchase-fastpath-v2` 和 `signal_purchase_attempt`。
- 载荷是 `siteKey: 'fkk'` 和 `source: 'shopify_pixel:fkk'`。
- 存在 `page_viewed`、`product_added_to_cart`、`checkout_started`、`checkout_completed`、`all_custom_events` 五个订阅。
- 存在 `event.clientId`、`shopify_client_` 和 `identitySource`。
- 不再存在 `fkk_signal_visitor_id`、`browser.localStorage`、`browser.sessionStorage` 或 `hmac_sha256`。
- `gtag('config', ...)` 保留 `send_page_view: false`，页面浏览由订阅统一发送。

## 六、完成标准

只有同时满足以下条件才算完成：

1. 列表里仍然只有一个 `FKK GA4`。
2. 状态显示“已连接 / Connected”。
3. 回读代码包含五个订阅和统一身份字段。
4. GA4 ID、Worker 地址和站点标识全部正确。
5. 没有修改其他 Pixel、主题或店铺配置。

## 七、汇报格式

完成后向用户说明：

- 店铺标识是否为 `fbed87-94`。
- Pixel 名称与连接状态。
- 五个订阅是否齐全。
- 是否确认不存在旧 localStorage 身份逻辑。
- 是否发现重复 Pixel、保存报错或连接失败。
- 提供显示 Pixel 名称、状态以及关键代码搜索结果的截图。

真实购买归并仍需下一笔自然订单验证；不要用“保存成功”代替真实业务验收。
