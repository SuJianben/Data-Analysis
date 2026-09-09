# 2026-09-09 菜单、全局埋点与用户行为趋势看板

## 本次目标

- 让菜单分析、全局埋点、用户行为三个页面与顶部时间范围真正联动。
- 在明细表前增加基于真实数据的趋势看板，按日期范围切换柱状图与折线图。

## 修改范围

- 本机 SQLite 聚合查询、Cloudflare D1 聚合查询和 Worker 读取路由。
- 新增共用时间序列图表与页面趋势看板组件。
- 三个明细页面并行读取明细数据和趋势数据，原有筛选、分页和用户明细链接保持不变。

## 新增内容

- `src/components/data-chart/time-series-chart.tsx`：共用时间序列图表；7 天以内按日柱状，超过 7 天按时间段折线，支持悬停提示和完整日期补零。
- `src/components/data-chart/page-trend-dashboard.tsx`：三项期间指标与趋势图的统一看板容器。
- `cloudflare/user-events/src/types.ts`：用户行为趋势点类型。

## 调整内容

- `src/app/menus/page.tsx`：增加期间点击、识别菜单、有数据天数和菜单趋势。
- `src/app/global-clicks/page.tsx`：增加期间点击、点击元素、涉及页面和全局点击趋势。
- `src/app/users/page.tsx`：增加期间事件、识别用户、购买事件和用户活动趋势。
- `src/services/database/repositories.ts`、`src/services/database/user-event-repository.ts`：新增本机按日聚合查询。
- `src/services/connectors/analytics.ts`、`src/services/connectors/user-events.ts`：新增趋势读取入口。
- `cloudflare/user-events/src/analytics-repository.ts`、`analytics-routes.ts`、`repository.ts`、`index.ts`：新增 D1 趋势查询及 `/v1/analytics/menu-trend`、`/v1/analytics/global-click-trend`、`/v1/users/trend` 路由。
- `src/components/dashboard/charts/traffic-bar-chart.tsx`：复用共用时间序列图表，避免趋势绘图逻辑重复。
- `src/app/globals.css`：增加明细看板、指标条和响应式布局样式。

## 影响范围

- 菜单分析、全局埋点、用户行为页面均显示所选日期范围，并且图表与明细表使用同一范围。
- 统计只来自当前真实菜单聚合、全局点击聚合和用户事件数据；无数据日期显示为 0。
- 7 天范围显示每日柱状图，超过 7 天显示按时间段标签的折线图。

## 自检结果

- 根项目 `npm run typecheck` 通过。
- Worker `npm run typecheck` 通过。
- 根项目 `npm run build` 通过，Vercel 生产构建通过。
- Cloudflare Worker 部署成功，版本 `6704b58b-2cbb-4ce8-baa2-8ae29cc40f80`。
- Vercel 已更新并继续使用别名 `https://tkf-signal.vercel.app`。
- 线上浏览器验证：菜单、全局埋点、用户行为在 2026-09-02 至 2026-09-08 均显示趋势图和真实数据；菜单切换到 2026-08-11 至 2026-09-08 后显示完整日期序列和时间段折线模式。

## 遗留问题

- 用户看板的“识别用户”沿用当前可加载用户列表数量（上限 500），用于明细查看；趋势中的“活跃用户”按每日去重用户数统计，跨日不会简单相加为期间去重总人数。

## 追加调整：双图看板

- 三个页面的趋势看板改为左右两个统计图，结构与概览页一致。
- 左图展示核心趋势：菜单点击、全局点击或用户事件；右图展示辅助趋势：活跃菜单、元素与页面，或活跃用户与购买事件。
- 两张图共用同一日期范围、补零规则和悬停提示；移动端自动纵向排列。
- 根项目类型检查与生产构建再次通过，未改变数据口径或数据来源。
