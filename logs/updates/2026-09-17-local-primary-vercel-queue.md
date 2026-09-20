# 2026-09-17 本地主库与 Vercel 队列迁移

## 本次目标

- 将 Cloudflare D1 从主数据库调整为迁移兼容层。
- 以本机 SQLite 作为四站统一主库。
- 保留 Vercel 作为 HTTPS 接入与线上展示层，并建立自动回收、GA4 同步和快照发布。

## 修改范围

- 新增 Vercel Queue 事件接收和本机轮询消费模块。
- 新增私有 Blob SQLite 快照发布、启动恢复和运行时版本刷新。
- 新增 Windows 本地服务、5 分钟事件同步、1 小时四站完整同步任务。
- 数据源状态、服务名、包名和文档统一改为多站点命名。
- Cloudflare 连接代码暂时保留，作为迁移回退，不再作为默认读写路径。

## 新增内容

- `src/services/queue/user-event-queue.ts`：稳定消息结构、固定区域和幂等键。
- `src/services/database/runtime-snapshot.ts`：私有快照校验、下载与运行时切换。
- `src/app/api/sync/queue-token/route.ts`：受服务密钥保护的短期生产队列凭证入口。
- `scripts/drain-vercel-events.mjs`：队列事件只有本地成功写入后才确认。
- `scripts/publish-local-snapshot.mjs`：SQLite 在线备份、完整性检查和私有快照发布。
- `scripts/sync-ga4-to-local.mjs`、`scripts/run-local-sync.mjs`：四站本地主库同步编排与失败补跑。
- `scripts/windows/start-local-server.ps1`、`scripts/windows/run-local-sync.ps1`：Windows 后台启动和计划任务入口。

## 调整内容

- `/api/events` 在 Vercel 改为写入队列，本机仍直接写 SQLite。
- 面板本地模式在读取前检查快照版本，30 秒窗口内复用检查结果。
- 旧 `sync-ga4-to-cloudflare.mjs` 改为本地同步兼容入口，不再上传 D1。
- 服务标识改为 `multi-site-analytics`。

## 影响范围

- 本机 `data/analytics.db` 成为唯一可写主库。
- Vercel 读取私有 Blob 中的只读 SQLite 快照。
- 仓库内四站埋点源文件已切换到正式多站点域名；店铺后台已发布的代码需要重新粘贴并发布后才会生效。

## 自检结果

- `npm run typecheck`：通过。
- `npm run build`：通过。
- 四站埋点、投递重试、购买证据和 BLK 过滤测试：通过。
- 生产队列真实写入与本机消费：通过，测试事件成功写入后已清理。
- 快照热更新：线上事件数无需重新部署即可从 23,346 更新至 23,347，清理后恢复 23,345。
- Windows 完整同步任务：四站 GA4 同步成功，TKF 173 行、TMS 556 行、FKK 1811 行、BLK 379 行；任务返回 0。
- Windows 事件任务：完成一次空队列检查和快照发布，任务返回 0。

## 遗留问题

- Vercel Queue 当前为 Beta，消息最长保留 7 天；本机连续离线超过 7 天需要人工确认是否存在过期消息。
- Shopify 与 SHOPLINE 后台中已经粘贴的 Pixel 不会随仓库文件自动更新；四站后台重新发布后，还需各发送一条真实事件完成最终验收。

## 域名切换

- 用户确认正式域名为 `https://multi-site-analytics.vercel.app`。
- 新域名已绑定当前生产部署；旧 `https://tkf-signal.vercel.app` 暂时保留为回退别名。
- TKF、TMS、FKK 和 BLK 的 Pixel 源文件已统一改为向新域名 `/api/events` 提交。
- BLK Script Publisher 加载地址和现行交接文档已同步更新。
- 生产环境允许来源补齐 TKF、TMS、FKK、BLK 的主域名与 `www` 域名。
- 事件任务仅在本地实际新增事件时发布快照，空队列不再重复上传 17MB 数据库。
- Blob 快照上传增加 120 秒超时，失败后由同步编排自动补跑一次。
- Vercel 项目已从 `tkf-signal` 重命名为 `multi-site-analytics`；新域名已注册为公开项目域名，而不是需要登录的普通别名。
- 四站新域名真实接收测试通过：BLK 1 条、FKK 1 条、TMS 1 条、TKF 2 条进入队列并写入本地；5 条测试记录随后全部精确删除，主库恢复 23,345 条。
- 空队列复测确认不会上传重复快照。
- 新域名四站页面均返回 HTTP 200；`/api/health` 返回服务名 `multi-site-analytics`、用户事件 23,345 条。
- 本地服务、5 分钟事件同步和 1 小时完整同步三项计划任务均为正常就绪，最近执行结果均为 0。
