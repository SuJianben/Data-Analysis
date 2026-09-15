# 2026-09-15 Shopify 身份统一与用户事件写入减压

## 本次目标

- TKF、TMS、FKK 的 Shopify 用户行为统一使用 Customer Pixel 提供的 `event.clientId` 作为匿名访客主标识。
- 在不丢失加购、开始结账和购买事件的前提下，减少页面浏览与重复点击造成的 Cloudflare D1 行写入。
- 删除被多站点复合索引覆盖的冗余用户事件索引，降低每条事件的索引写放大。

## 修改范围

- Shopify Customer Pixel：TKF、TMS、FKK。
- Shopify 主题点击发布：TKF 公共点击脚本、TMS 点击脚本与身份配置。
- Cloudflare 用户事件 Worker：写入前策略与健康版本。
- D1 用户事件索引迁移。
- 自动化测试、README 与项目日志。

## 新增内容

- `cloudflare/user-events/src/event-write-policy.ts`：集中管理低价值事件过滤；机器人或缺少稳定平台身份的页面、点击事件不落库，购买等高价值事件不受影响。
- `cloudflare/user-events/migrations/0004_user_event_write_optimization.sql`：清理旧单站索引，新增按站点隔离的客户时间索引。
- `scripts/test-shopify-signal-identity.mjs`：同时模拟 TKF、TMS、FKK 的页面、点击、加购、结账和购买链路。

## 调整内容

- TMS Customer Pixel 从“仅购买写 Signal”升级为页面、点击、加购、开始结账、购买完整链路。
- TKF 历史购买桥升级为完整 Signal 行为桥，保留原文件名以兼容既有安装说明。
- TKF、TMS、FKK 全部生成 `shopify_client_<clientId>` 访客号；原始客户 ID 和订单 ID 只在 Pixel 内转为 SHA-256。
- 同一访客同一路径页面浏览使用 5 分钟去重窗口，同一元素点击使用 5 秒去重窗口；GA4 上报不受该 Signal 去重影响。
- TMS 主题点击停止同时调用旧身份模块直写 Signal，只通过 Shopify Analytics 发布给 Customer Pixel。
- TKF 公共点击脚本在 Shopify 环境优先发布 `tkf:global_click`，独立站环境才使用本地访客号直写。
- Worker 健康版本更新为 `2026-09-15.write-policy-v1`。
- TMS 独立购买桥退役，避免与完整 Pixel 同时安装造成重复购买。

## 数据库索引

迁移前用户事件表包含唯一约束和 5 个业务索引；迁移后保留：

- `UNIQUE(source, event_id)`；
- `site_key + occurred_at`；
- `site_key + visitor_id + occurred_at`；
- `site_key + customer_id_hash + occurred_at`（只索引非空客户哈希）。

按一次主表写入加索引维护估算，单条新事件由约 7 次行写入降至约 5 次，索引写放大约降低 28.6%；Cloudflare 实际计费以平台统计为准。

## 影响范围

- 新版 Pixel 生效后的 TKF、TMS、FKK 用户轨迹。
- 四个站点 Worker 共用写入策略；BLK 既有异常筛选页规则保持不变，并补充统一机器人与不稳定低价值身份过滤。
- 历史事件不重写、不猜测归并。
- 页面展示和 GA4 数据源未调整。

## 自检

- 三站完整 Shopify 模拟链路通过：7 条请求使用同一 `clientId`；页面和点击得到稳定去重事件号；加购、开始结账、购买保持独立事件号。
- 原始客户 ID 和订单 ID 未出现在 Signal 请求体；客户、订单哈希均为 64 位。
- Shopify Pixel 隔离来源校验通过。
- BLK 与跨站低价值事件过滤测试通过，购买事件在机器人或兜底身份条件下仍保留。
- 主项目与 Worker TypeScript 类型检查通过。
- Next.js 生产构建通过。
- 本地 D1 迁移成功，索引结构与三类查询执行计划已核对。
- 本地重复写入实测：相同 `source + event_id` 连续提交两次，最终只保存 1 行，测试数据已删除。
- 四个线上 Worker 已发布，健康接口均返回 `2026-09-15.write-policy-v1`。
- 线上 FKK 兜底页面事件实测返回 `inserted: 0`、`filtered: 1`，没有消耗 D1 行写入。
- Vercel 生产环境已发布；线上 `tkf-user-tracker.js` 与仓库文件 SHA-256 完全一致，并包含 `tkf:global_click` 发布逻辑。

## 发布状态

- Cloudflare Worker：已发布。
- Vercel 面板与 TKF 公共点击脚本：已发布。
- 远程 D1 索引迁移：未执行。Cloudflare 返回免费套餐当日行写入额度已耗尽；本地迁移已验证，待 UTC 00:00（北京时间次日 08:00）额度重置后执行。
- Shopify Customer Pixel 与 TMS 主题资产：仓库代码已就绪，仍需在各站后台替换或发布后才会在线生效。

## 遗留问题

- 远程 D1 仍使用旧索引，暂时没有获得约 28.6% 的索引写放大下降。
- TKF、TMS、FKK 后台尚未完成本轮 Pixel 替换；当前线上身份连续性以各站现有 Pixel 版本为准。
