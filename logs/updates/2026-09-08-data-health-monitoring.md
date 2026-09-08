# 2026-09-08 数据健康监控

## 本次目标

为 TKF Signal 增加可自动运行的数据健康检查，及时发现 GA4 同步过期、数据断流、埋点字段质量下降和数据量异常。

## 修改范围

- Cloudflare Worker 的健康计算与只读接口；
- Vercel 面板的数据健康页面、导航和响应式样式；
- 数据连接层与共享类型；
- 每日 GA4 自动同步任务；
- 项目和 Worker 使用文档。

## 新增内容

- `cloudflare/user-events/src/health-types.ts`：定义 Worker 健康报告结构。
- `cloudflare/user-events/src/health-repository.ts`：从 D1 计算同步新鲜度、连续性、字段有效率和数据量波动。
- `src/app/health/page.tsx`：数据健康页面入口。
- `src/components/health/health-dashboard.tsx`：总状态、检查结果和7天明细展示。

## 调整内容

- `cloudflare/user-events/src/analytics-routes.ts`：新增受只读密钥保护的 `/v1/analytics/health` 接口。
- `src/services/connectors/analytics.ts`：增加健康报告读取方法。
- `src/types/analytics.ts`：增加健康报告公共类型。
- `src/components/app-shell/nav-links.tsx`：增加“数据健康”导航。
- `src/components/app-shell/date-range-filter.tsx`：健康页显示固定检查范围说明，避免误认为顶部日期筛选会改变健康阈值。
- `src/app/globals.css`：增加桌面端和移动端健康页面样式，并将移动导航调整为6项。
- `README.md`、`cloudflare/user-events/README.md`：补充健康检查规则和接口说明。
- Codex 自动化 `ga4`：升级为每日同步后自动检查健康状态，正常时保持安静，异常时通知。

## 影响范围

- 不修改现有埋点采集与历史数据。
- 健康检查使用最近7个完整自然日，不把当天未结束的数据判定为异常。
- 总状态取四项检查中最严重的状态：运行正常、需要关注或发现异常。

## 自检结果

- 主项目 TypeScript 类型检查通过。
- Cloudflare Worker TypeScript 类型检查和部署前构建通过。
- Worker 已部署，健康查询可以读取 D1 真实数据。
- Vercel 生产构建和部署通过。
- 桌面端真实浏览器验证通过：当前为运行正常，7/7 天有数据，字段有效率 99.5%。
- 移动端 390×844 视口验证通过，导航、状态和检查明细可正常显示。
- 自检发现并修复日期标签受浏览器时区影响提前一天的问题。

## 遗留问题

- 线上仍会请求尚未提供的 `favicon.ico`，浏览器控制台产生一次 404；不影响数据健康功能。
- 实时用户事件在最近7个完整日为 0，健康状态目前以 GA4 报表连续性为核心，不将该项单独判为异常。
