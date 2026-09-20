# 2026-09-16 FKK Signal 写入稳定性优化

## 本次目标

- 在不导入、不补录 Shopify 订单的前提下，降低 FKK 用户行为对 Cloudflare D1 的写入压力。
- 让购买事件写入失败能够被重试和识别，而不是静默丢失。

## 修改范围

- `cloudflare/user-events/src/event-write-policy.ts`
- `cloudflare/user-events/src/index.ts`
- `cloudflare/user-events/migrations/0004_user_event_write_optimization.sql`
- `shopify/customer-pixels/fkk-ga4-customer-pixel.js`
- `scripts/test-blk-traffic-filter.mjs`
- `scripts/test-fkk-shopify-signal.mjs`
- `cloudflare/user-events/README.md`

## 新增与调整

- Worker 对页面浏览使用 5 分钟窗口、对全局点击使用 5 秒窗口生成服务端确定性事件号；旧 Pixel 即使提交不同平台事件号，重复低价值行为也只写一行。
- 加购、开始结账和购买继续保留原平台事件号，不参与窗口去重。
- D1 写入失败改为返回可重试的 `503`，同时输出不含客户、订单和页面明细的结构化故障日志。
- FKK Pixel 对开始结账和购买执行有限重试；购买重试始终复用同一事件号。
- 最终投递失败时向 GA4 发送 `signal_delivery_error` 诊断事件，不将 Shopify 订单作为补数来源。
- 远端应用 `0004_user_event_write_optimization.sql`，删除三个被多站点索引覆盖的旧索引并新增站点客户时间索引。

## 影响范围

- Worker 端服务策略由共享源码维护；为避免其他站点耗尽共享 D1 配额，本次已发布 TKF、TMS、FKK、BLK 四个入口。
- D1 索引调整作用于四站共享数据库。
- FKK Pixel 重试代码已准备完成，但当前浏览器登录账号无 FKK 设置权限，尚未在 Shopify 后台保存发布。

## 自检

- Worker TypeScript 类型检查通过。
- BLK 流量过滤与 Worker 服务端去重测试通过。
- FKK 完整身份、购买哈希、失败重试与 GA4 诊断测试通过。
- Shopify 三站身份和低价值事件窗口去重回归测试通过。
- 线上连续提交两条事件号不同但业务语义相同的 FKK 页面浏览：第一次 `inserted=1`，第二次 `inserted=0`。
- 线上专用测试记录已精确删除，复查剩余 0 条。
- 四个 Worker `/health` 均返回 `2026-09-16.write-policy-v2`，服务名与站点入口一致。

## 遗留问题

- 需要有 FKK Customer Events 权限的账号，把最新 `fkk-ga4-customer-pixel.js` 全文更新到 Shopify 后台后保存并连接。
- 历史漏采订单不从 Shopify 补录，继续保持 Shopify、GA4 与 Signal 三条数据链独立。
