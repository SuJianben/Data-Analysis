# 2026-09-20 KV 快照中转优化

## 本次目标

- 解除线上面板对已暂停 Vercel Blob 的依赖。
- 保留“本地 SQLite 主库 + Vercel 接入与展示”的既定方向。
- 优先保证购买事件可见，同时降低整库上传次数。

## 新增内容

- `cloudflare/user-events/src/snapshot-routes.ts`：快照上传、版本检查、下载、鉴权和 SHA-256 校验。
- `cloudflare/user-events/src/analysis-result-routes.ts`：AI 分析结果的 KV 写入、读取和维护删除。
- `src/services/database/remote-snapshot.ts`：Vercel 端远程快照检查、下载、gzip 解压和传输校验。
- `scripts/lib/sqlite-snapshot.mjs`：SQLite 在线备份、完整性检查、gzip 压缩和 Worker 发布。
- `scripts/test-snapshot-transport.mjs`：快照与分析结果中转协议测试。

## 调整内容

- `scripts/run-local-sync.mjs`：普通事件与线上发布解耦；购买事件触发优先发布，完整同步固定发布。
- `scripts/drain-vercel-events.mjs`：输出购买优先事件数量，供同步编排决策。
- `src/services/database/runtime-snapshot.ts`：快照源故障改为可恢复降级，不再中止页面请求。
- `src/services/analysis/analysis-result-store.ts`：线上持久化从 Vercel Blob 切换到 Worker KV。
- 删除应用对 `@vercel/blob` 的依赖。

## 自检结果

- 主项目与 Worker TypeScript 检查通过。
- 快照与 AI 分析 KV 协议测试通过。
- 33,232 条事件数据库的备份、压缩和完整性检查通过；原始约 28.00 MiB，压缩约 5.77 MiB。
- 五站埋点、购买快速通道、投递重试、购买证据及 Worker 来源校验测试通过。
- Next.js 正式构建通过。
- Worker 已部署并完成真实远程读写验证。
- Vercel 生产版本已发布到正式多站点域名 `https://multi-site-analytics.vercel.app`；旧 `https://tkf-signal.vercel.app` 仅保留为回退别名。
- `/api/health` 连续 3 次返回 200，线上稳定读取 33,232 条用户事件，不再间歇返回 Blob 暂停错误。
- TMS、FKK、DTK 的用户行为页与数据健康页共 6 个页面均返回 200，未出现“数据源暂时不可用”。
- 2026-09-18 至 2026-09-20 的线上用户行为统计核对为：TMS 3 次购买、FKK 2 次购买、DTK 1 次购买。

## 遗留事项

- Vercel 项目尚未与 GitHub 自动部署连接；当前生产发布通过已授权的本机 Vercel CLI 完成。
- 购买埋点完整性仍需继续与各站自然订单逐单对账，快照恢复不等于埋点准确性已经最终验收。
