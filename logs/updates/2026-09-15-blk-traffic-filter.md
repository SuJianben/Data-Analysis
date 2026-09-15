# 2026-09-15 BLK 异常页面浏览过滤

## 本次目标

- 阻止 BLK 的机器人和异常组合筛选页浏览继续消耗 Cloudflare D1 免费写入额度。
- 保留正常页面浏览、点击、加购、结账和购买数据。

## 修改范围

- BLK SHOPLINE 客户事件 Pixel。
- Cloudflare Worker 写入前流量过滤。
- BLK 自包含交接文档和自动化测试。

## 新增内容

- `cloudflare/user-events/src/traffic-filter.ts`：集中维护机器人 User-Agent、组合筛选路径和不稳定页面身份过滤规则。
- `scripts/test-blk-traffic-filter.mjs`：验证正常浏览放行，异常页面浏览过滤，购买事件不受影响。

## 调整内容

- BLK `page_view` 在客户端跳过已知机器人、`blk-combo--` / `blk-team--` 组合筛选路径和缺少稳定 `clientId` 的浏览。
- Signal 事件增加 `identitySource`，后端可识别稳定 SHOPLINE clientId 与事件级兜底身份。
- Worker 在 D1 写入前执行同样的 BLK 页面浏览保护；被过滤请求返回成功但 `inserted = 0`。
- 交接文档的内嵌客户事件代码与正式源码同步。

## 影响范围

- 仅过滤 `siteKey=blk`、`source=shopline_pixel:blk` 的 `page_view`。
- TKF、TMS、FKK 以及 BLK 的点击、加购、结账和购买事件均不受影响。
- 历史异常数据未删除。

## 自检

- BLK 流量过滤测试、原有 Shopify Pixel 测试、主项目和 Worker 类型检查全部通过。
- Next.js 生产构建通过。
- BLK Worker 已发布，版本 `15ee0e99-8a2b-4a50-8f5b-0dd58437c0d7`。
- D1 已超过免费写入额度时，线上机器人请求和连续三次组合筛选页请求仍返回 200、`inserted = 0`、`filtered = 1`，确认过滤发生在数据库写入之前。

## 遗留问题

- SHOPLINE 后台当前 Pixel 仍需按更新后的交接代码替换，才能同时阻止异常浏览进入 GA4；Worker 端 D1 保护已经生效。
- 已写入的历史异常记录需经确认后再清理，当前未执行删除。
- D1 免费额度要到次日 UTC 00:00（北京时间 08:00）恢复，恢复后需复查正常商品页可以写入。
