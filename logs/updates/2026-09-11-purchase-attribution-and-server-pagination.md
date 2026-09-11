# 2026-09-11 更新记录

## 本次目标

- 补齐 Shopify 完成购买到用户行为的归因链路。
- 将全局点击明细从浏览器全量分页改为 Cloudflare Worker 服务端分页。

## 修改范围

- Shopify Customer Pixel 购买桥接。
- Cloudflare Worker 全局点击查询、汇总接口与 D1 查询。
- Next.js 全局点击数据服务、页面参数解析、筛选和分页组件。
- 项目接入说明、更新日志和 BUG 日志。

## 新增内容

- `shopify/customer-pixels/tkf-signal-purchase-bridge.js`：脱敏购买事件桥接。
- `cloudflare/user-events/src/global-click-query.ts`：Worker 查询参数校验和分页上限。
- `src/features/report-pagination/global-click-query.ts`：页面查询参数解析。
- `src/components/global-clicks/global-click-controls.tsx`：URL 驱动的搜索和设备筛选。
- `src/components/data-table/server-pagination.tsx`：服务端分页导航。

## 调整内容

- `/v1/analytics/global-clicks` 按页返回明细，默认每页 20 条，同时返回总条数、总页数和筛选后点击总量。
- 新增 `/v1/analytics/global-click-summary`，单独返回完整时间范围的指标、设备构成和分布散点。
- 全局点击页面不再把全部明细传到浏览器；切页、搜索和设备筛选均重新请求 Worker。
- 本机 SQLite 回退保持与线上相同的返回结构，便于离线开发。

## 影响范围

- 线上全局点击页面和 `/api/global-clicks`。
- 图表仍反映完整所选时间范围，不会因当前只展示 20 条而缩小统计口径。
- 菜单和用户列表原有分页本次不改，避免扩大需求范围。

## 自检

- Next.js 类型检查通过。
- Worker 类型检查通过。
- Next.js 生产构建通过。
- Pixel JavaScript 语法检查与模拟购买传输通过。
- Worker 已部署，版本 `732a06a7-b4ae-4d05-b7cb-2070924a0cdc`。
- Vercel 已部署并绑定 `https://tkf-signal.vercel.app`。
- 真实线上验证：范围内共 783 条聚合明细、40 页；第 1 页和第 2 页各返回 20 条且首条不同；移动设备筛选只返回 mobile；页面汇总仍显示 1,248 次完整范围点击。

## 遗留问题

- Shopify Pixel 需要在后台执行一次正式保存后，新的购买才能进入用户行为链路。
- 历史购买没有用户级事件，不能仅凭 GA4 汇总数据补回具体购买者。
