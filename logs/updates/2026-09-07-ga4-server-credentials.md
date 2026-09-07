# 2026-09-07 腾讯云 GA4 固定凭证

## 本次目标

解决腾讯云数据源页面显示“尚未固定 · 可临时同步”的问题，让服务器使用 OAuth Refresh Token 自动换取 GA4 Access Token。

## 修改范围

- 在腾讯云 `/opt/tkf-signal/.env.local` 写入 GA4 Property ID、OAuth Client ID、OAuth Client Secret 和 OAuth Refresh Token。
- 写入前检查服务器原本不存在 `.env.local`；未覆盖数据库或应用代码。
- 设置 `.env.local` 权限为 `600`，并重启 `tkf-signal` systemd 服务。

## 自检结果

- 服务器配置检查：四项变量均已配置，输出已脱敏。
- `systemctl is-active tkf-signal`：返回 `active`。
- 公网 `http://139.199.202.173/sources`：显示“OAuth 已固定”。
- 公网 `http://139.199.202.173/api/health`：返回 200；数据库原有统计保持不变。

## 遗留问题

腾讯云当前仍使用 HTTP IP 入口；如果后续接入 Shopify 用户事件采集，需要配置 HTTPS 域名。Google OAuth 应用若保持“测试”状态，Refresh Token 仍可能受 7 天有效期限制。
