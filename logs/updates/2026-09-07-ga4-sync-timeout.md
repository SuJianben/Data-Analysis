# 2026-09-07 GA4 同步错误处理

## 本次目标

修复 GA4 同步失败时页面显示 `Unexpected token '<'` 的问题，并让腾讯云无法访问 Google 时快速返回明确错误。

## 修改范围

- `src/services/connectors/ga4-auth.ts`：改用带 12 秒超时的 OAuth Refresh Token 请求，区分网络超时、Refresh Token 失效和凭证错误。
- `src/services/connectors/ga4.ts`：为 GA4 Reporting API 请求增加 20 秒超时，并兼容非 JSON 错误响应。
- `src/app/api/sync/ga4/route.ts`：把同步记录初始化纳入异常处理，避免初始化失败时产生 HTML 错误页。
- `src/components/sources/source-manager.tsx`：先读取文本再解析 JSON，代理返回 HTML 时显示可读的 HTTP 错误。

## 影响范围

只影响 GA4 同步请求的超时与错误展示；成功同步的数据结构和数据库写入逻辑不变。

## 自检结果

- `npm run build`：通过，TypeScript 与 Next.js 生产构建均成功。
- 腾讯云出网检查：百度可访问，但 `oauth2.googleapis.com:443` IPv4 请求超时，确认当前问题为服务器到 Google 的网络路径阻断。
- 腾讯云已应用接口级超时热修复并重启服务；实际 POST 验证在约 15 秒后返回 HTTP 400 JSON，页面同步日志可读显示超时原因。

## 遗留问题

腾讯云需要配置可访问 Google 的 HTTPS 代理或同步中转服务后，GA4 才能真正拉取新数据。
