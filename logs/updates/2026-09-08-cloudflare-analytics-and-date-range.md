# 2026-09-08 Cloudflare 报表迁移与时间范围

## 本次目标

- 将线上概览、菜单、全局点击和 AI 数据集从旧 SQLite 快照迁移到 Cloudflare D1。
- 让概览、菜单、全局点击、用户行为、用户明细和 AI 分析共用可自定义的时间范围。
- 完整显示趋势图所选日期，并提供清晰的悬停数据提示。

## 修改范围

- 新增 Cloudflare D1 报表表结构、报表导入接口与读取接口。
- 新增 Next.js 报表连接器和 Cloudflare 同步脚本。
- 新增公共日期范围模块与顶部日期选择器。
- 调整各页面、API、Cloudflare 查询和本机 SQLite 查询，使日期过滤贯通真实数据链路。
- 将每日自动任务从腾讯云同步命令切换为 Cloudflare D1 同步命令。

## 新增内容

- `cloudflare/user-events/migrations/0002_analytics_reports.sql`：菜单、网站指标、全局点击与同步记录表。
- `cloudflare/user-events/src/analytics-*.ts`：报表类型、校验、仓库和路由模块。
- `cloudflare/user-events/src/date-range.ts`：Worker 日期参数校验。
- `src/services/connectors/analytics.ts`：Cloudflare 与本机 SQLite 的统一报表读取入口。
- `src/features/date-range/date-range.ts`：默认范围、日期校验、日期序列和 URL 参数工具。
- `src/components/app-shell/date-range-filter.tsx`：全局时间范围选择器。
- `scripts/sync-ga4-to-cloudflare.mjs`：本机 GA4 到 Cloudflare D1 的覆盖式同步任务。

## 调整内容

- 同一来源与日期范围重新导入时，先删除旧聚合行再写入新结果，避免重复和过期数据。
- 页面切换保留 `startDate` 与 `endDate`。
- 趋势图补齐无数据日期为 0；鼠标悬停或键盘聚焦时显示完整日期与点击次数。
- 线上侧边栏明确显示 `Cloudflare D1 / 云端数据已连接`。
- 清理同步记录中不应展示给用户的热力图技术报错。

## 影响范围

- 线上地址：`https://tkf-signal.vercel.app`。
- Worker：`https://tkf-signal-user-events.trustmereview.workers.dev`。
- 当前 D1 已导入 2026-09-01 至 2026-09-07 的 682 行真实 GA4 汇总数据。

## 自检结果

- 根项目 TypeScript 检查通过。
- Worker TypeScript 检查与部署预检通过。
- Next.js 生产构建通过，Vercel 构建通过。
- Cloudflare Worker 部署成功，D1 远端记录核对成功。
- 线上验证：9 月 2 日菜单点击 27 次，9 月 7 日菜单点击 13 次；不同范围返回不同统计值。
- 线上浏览器验证：9 月 2 日至 9 月 8 日完整显示 7 个日期点，9 月 8 日为 0，悬停提示正常。
- 用户行为日期过滤验证：9 月 7 日无记录，9 月 8 日为 2 位用户、8 条事件，用户明细事件均处于所选日期。

## 遗留问题

- GA4 菜单埋点从 9 月 2 日开始，因此更早日期只能显示为 0，无法补回埋点启用前不存在的菜单点击。
- 线上 AI 当前未配置独立提供商环境变量时会使用本地规则分析；时间范围已正确传入。
