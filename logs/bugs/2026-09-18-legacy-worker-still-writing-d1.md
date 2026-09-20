# 2026-09-18 旧 Pixel Worker 仍写入 D1

## 缺陷现象

- GA4 在 2026-09-18 仍有四站数据，但本地用户行为队列没有新增事件。
- TKF、TMS、FKK、BLK 的最后一条用户行为都停留在 2026-09-17。

## 根本原因

- 仓库内 Pixel 已切换到多站点 Vercel 域名，但店铺后台已发布的代码不会自动更新。
- 旧 Pixel 仍请求四个 `workers.dev/v1/events` 地址，而这些 Worker 仍尝试写 Cloudflare D1。
- D1 配额不可用后，GA4 上报继续正常，Signal 用户行为写入中断。

## 修复方案

- 保留四个旧 Worker 域名作为兼容入口。
- Worker 继续执行站点、来源和不透明 Pixel 载荷校验。
- 校验通过后不再写 D1，原始事件转发到 `https://multi-site-analytics.vercel.app/api/events`。
- Vercel 统一执行写入策略、进入队列，再由本机任务写入 SQLite。

## 状态

- 修复状态：已修复并完成技术链路验证
- 四个 Worker 已成功部署，健康检查均显示 `vercel-queue-proxy`。
- 四站各使用正式店铺 Origin 向旧 Worker 地址发送 1 条测试事件，全部返回 200 和 `mode=queued`。
- 另以 Customer Pixel 沙箱使用的 `Origin: null` 对四站各测试 1 条，全部返回 200 和 `mode=queued`。
- 两轮共 8 条事件全部由本机消费并写入 SQLite，验证后按探针标记精确删除，数据库恢复为 23,345 条用户事件。
- 待自然访客产生新事件后继续确认线上自然流量恢复情况。
