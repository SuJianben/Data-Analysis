# 2026-09-17 D1 故障本地降级更新

## 本次目标

- D1 配额耗尽或 Cloudflare 临时不可用时，数据面板仍可打开，不再出现整页白屏。

## 修改范围

- `src/services/connectors/cloudflare-request.ts`
- `src/services/connectors/data-source-fallback.ts`
- `src/services/connectors/analytics.ts`
- `src/services/connectors/user-events.ts`
- `src/services/database/user-event-repository.ts`
- `src/app/users/page.tsx`
- `src/app/health/page.tsx`
- `src/app/error.tsx`
- `src/components/data-source/data-source-notice.tsx`
- `src/components/app-shell/app-shell.tsx`
- `src/app/globals.css`
- `data/analytics-deploy.db`

## 新增内容

- 云端优先、本地 SQLite 兜底的统一读取模块。
- 数据源不可用页面和应用级错误边界。
- 最新本地 GA 数据部署快照。
- 按快照指纹隔离的 Vercel 临时数据库文件。
- 本地数据健康计算模块，保持与 Cloudflare Worker 相同的五项检查口径。

## 调整内容

- Cloudflare 429、5xx、超时和网络错误被视为可恢复故障。
- 概览、菜单、全局点击和 AI 分析数据可自动回退到本地快照。
- 从 D1 完整导出并增量合并 23,345 条用户行为到本地数据库，用户行为页可在 D1 读取额度耗尽时继续展示。

## 影响范围

- 不改变正常情况下的数据来源，D1 可用时仍优先读取 D1。
- 本地兜底仅用于读取，不会向本地伪造用户行为，也不会改动网站埋点。

## 自检

- TypeScript 类型检查通过。
- Next.js 生产构建通过。
- 最新部署快照完整性检查为 `ok`，包含 485 行菜单、292 行站点指标和 4177 行全局点击数据。
- 本地生产验证：FKK 用户行为页返回 200，正常渲染用户摘要，耗时约 445ms。
- 修复 Vercel 不同实例复用旧 `/tmp` 数据库造成的站点间展示不一致。
- 线上最终验证：TKF、TMS、FKK、BLK 四站用户行为页均返回 HTTP 200 并正常渲染数据，未再进入不可用提示。
- 本地生产验证：四站数据健康页均返回 HTTP 200 并显示自动检查结果，单页计算约 24—382ms。
- 线上最终验证：TKF、TMS、FKK、BLK 四站数据健康页均返回 HTTP 200 并显示真实监控结果。
- 已发布至 `https://tkf-signal.vercel.app`。

## 遗留问题

- 当前用户行为本地副本来自一次性 D1 导出，后续仍需建立自动增量备份，避免本地快照再次落后。
