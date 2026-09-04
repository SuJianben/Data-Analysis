# 2026-09-04 用户级行为链路

## 本次目标

补齐用户级行为记录，让每个匿名访客的页面、链接、按钮和商品交互可以独立归属，并在面板中查看用户摘要与行为时间线。

## 修改范围

- 新增 `user_events` SQLite 表、索引和去重逻辑，按 `source + eventId` 防止重复写入。
- 新增 `POST /api/events` 事件接收接口，支持单条或批量事件、CORS、可选接收凭证和格式校验。
- 新增 `/users` 用户摘要页、`/users/[visitorId]` 用户行为详情页及对应 API。
- 新增 `public/tkf-user-tracker.js`，为 Shopify 主题生成匿名访客/会话标识并记录链接、按钮点击。
- 导航栏新增“用户行为”入口；健康检查增加用户事件数量。

## 数据边界

仅保存匿名 `visitorId`、可选的脱敏客户标识、事件时间、页面和控件信息。脚本不会主动采集姓名、邮箱或电话。现有 GA4 汇总数据不会自动变成用户级记录，必须由站点加载追踪脚本并向事件接口发送明细。

## 自检结果

- `npm run typecheck`：通过。
- `npm run build`：通过，用户 API 与页面均生成。
- 本地 `GET /users`、`GET /api/users`、`GET /api/health`：通过。
- 本地空请求 `POST /api/events`：按预期返回 400，数据库未写入测试数据。

## 遗留问题

Shopify 主题尚未加载追踪脚本；腾讯云当前公网入口仍是 HTTP IP。正式接入前需要为分析服务配置 HTTPS 域名，并将脚本中的 endpoint 指向该域名，否则浏览器会阻止 HTTPS 商店页面请求 HTTP 接口。

## 发布状态

- GitHub：已推送提交 `906efea` 到 `main`。
- Vercel：已发布并验证 `/users`、`/api/users`、`/api/events`、`/tkf-user-tracker.js` 均可访问。
- 腾讯云：现有版本保持运行；因控制台登录态失效，本次代码尚未上传，待重新登录后再更新，服务器数据库不受影响。
