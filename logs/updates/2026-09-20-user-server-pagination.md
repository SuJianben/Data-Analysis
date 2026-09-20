# 2026-09-20 用户行为服务端分页

## 本次目标

- 移除用户行为页固定 500 人、25 页的展示上限。
- 让分页总数严格跟随顶部所选日期范围。
- 支持直接输入页码跳转。

## 新增内容

- `src/features/users/user-summary-query.ts`：集中解析用户表格页码并维护每页数量。

## 调整内容

- `src/services/database/user-event-repository.ts`：新增用户摘要总数查询和分页查询。
- `src/services/connectors/user-events.ts`：统一返回用户摘要行与分页元数据。
- `src/app/users/page.tsx`：使用日期范围和页码加载当前页，指标显示完整用户总数。
- `src/components/users/user-table.tsx`：移除浏览器内 500 行切片，复用服务端分页组件。
- `src/components/data-table/server-pagination.tsx`：新增自定义页码输入和跳转。
- `src/app/api/users/route.ts`：支持 `page`、`pageSize` 和完整分页元数据。
- `cloudflare/user-events/src/repository.ts`、`index.ts`：Cloudflare 兼容读取接口同步支持分页。
- `src/app/globals.css`：补充分页跳转输入框及移动端换行样式。

## 影响范围

- 只调整用户行为摘要表及共用服务端分页控件。
- 用户详情链接继续保留站点与日期范围。
- 用户趋势、购买总数、设备分布仍按完整日期范围统计；散点图维持原有最多 500 位用户的日期范围样本。

## 自检结果

- 主项目与 Worker TypeScript 检查通过。
- Next.js 正式构建通过。
- Playwright 已验证第 100 页跳转、日期范围变化、页码自动复位和总页数重算。
- Cloudflare Worker 与 Vercel 生产部署已完成。
- 正式域名 `https://multi-site-analytics.vercel.app` 已通过线上真实链路复核：FKK 2026-09-14 至 2026-09-20 共 5,050 位用户、253 页，第 100 页显示第 1,981 至 2,000 条。
- 将日期改为 2026-09-19 至 2026-09-20 后，线上自动重算为 1,470 位用户、74 页，并回到第 1 页。
- 误恢复的 `tkf-signal.vercel.app` 旧别名已再次移除，仅保留 multi 域名作为正式入口。

## 遗留问题

- 当前事件回收任务仍存在 `payload is not defined` 错误，本次按需求边界未修改该数据同步逻辑。
