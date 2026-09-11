# TKF Signal User Events Worker

该子项目负责按站点保存 TKF、TMS 的 GA4 汇总报表与脱敏用户行为。D1 不保存姓名、邮箱、电话或 Shopify 原始客户 ID。

## 接口

- `GET /health`：健康检查。
- `POST /v1/events`：店铺浏览器或持有服务端写入密钥的系统提交事件。
- `GET /v1/users`：持有只读密钥的服务端读取用户摘要。
- `GET /v1/users/:identityKey`：持有只读密钥的服务端读取单个用户行为。
- `POST /v1/analytics/import`：持有服务端写入密钥的本机同步任务覆盖导入指定日期范围。
- `GET /v1/analytics/overview`：读取概览指标、趋势和高频菜单。
- `GET /v1/analytics/menus`：读取菜单点击明细。
- `GET /v1/analytics/global-clicks`：读取全局点击明细。
- `GET /v1/analytics/dataset`：读取 AI 分析使用的数据集。
- `GET /v1/analytics/health`：检查最近同步、7天数据连续性、关键字段质量和数据量波动。

报表和用户行为读取接口支持 `site=tkf|tms&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`。未传 `site` 时兼容为 `tkf`。站点和日期筛选都在 D1 查询层执行，概览、表格、用户行为和 AI 使用同一统计范围，两个站点的数据不会互相混入。健康检查固定使用所选站点最近7个完整自然日，避免当天尚未完整的数据触发误报。

## 本机开发

```bash
npm install
npm run db:migrate:local
npm run dev
```

## 首次部署

1. 在 `wrangler.jsonc` 中绑定已创建的 D1 数据库。
2. 执行 `npm run db:migrate:remote`。
3. 分别执行 `npx wrangler secret put READ_API_KEY` 和 `npx wrangler secret put SERVER_INGEST_KEY`。
4. 执行 `npm run deploy`。

密钥只保存在 Cloudflare 和调用方的环境变量中，禁止写入代码、日志或 Git 仓库。`ALLOWED_ORIGINS` 只填写正式店铺 HTTPS 域名。

## 用户归属规则

- 未登录行为按 `visitorId` 汇总。
- 登录行为按不可逆 `customerIdHash` 跨浏览器汇总。
- 一个浏览器只关联过一个登录客户时，登录前行为归入该客户。
- 共享浏览器关联多个客户时，无法确认归属的匿名行为保持独立，防止把用户 A 的行为算给用户 B。
