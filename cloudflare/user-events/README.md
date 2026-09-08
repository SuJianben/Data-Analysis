# TKF Signal User Events Worker

该子项目只负责两件事：Worker 提供用户行为接口，D1 持久保存脱敏后的事件。它不保存姓名、邮箱、电话或 Shopify 原始客户 ID。

## 接口

- `GET /health`：健康检查。
- `POST /v1/events`：店铺浏览器或持有服务端写入密钥的系统提交事件。
- `GET /v1/users`：持有只读密钥的服务端读取用户摘要。
- `GET /v1/users/:identityKey`：持有只读密钥的服务端读取单个用户行为。

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
