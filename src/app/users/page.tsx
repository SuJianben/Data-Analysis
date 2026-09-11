import { UserTable } from "@/components/users/user-table";
import { PageTrendDashboard } from "@/components/data-chart/page-trend-dashboard";
import { UserDistributionScatter } from "@/components/users/user-distribution-scatter";
import { loadUserDeviceBreakdown, loadUserSummaries, loadUserTrend } from "@/services/connectors/user-events";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";
import { resolveSite, siteRangeQuery } from "@/features/site-selection/site-selection";
import { sites } from "@/config/sites";

export default async function UsersPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const params = await searchParams;
  const range = resolveDateRange(params);
  const site = resolveSite(params);
  const selectedSite = sites[site];
  const query = { ...range, site };
  const rangeQuery = siteRangeQuery(site, range);
  const [rows, trend, devices] = await Promise.all([loadUserSummaries(500, query), loadUserTrend(query), loadUserDeviceBreakdown(query)]);
  const totalEvents = trend.reduce((sum, point) => sum + Number(point.events || 0), 0);
  const totalPurchases = trend.reduce((sum, point) => sum + Number(point.purchases || 0), 0);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div><span className="section-number">04 / USERS · {selectedSite.shortLabel}</span><h1>用户行为</h1><p>分别查看 {selectedSite.label} 匿名访客与登录客户的页面、按钮和商品互动。</p></div>
      </header>
      <PageTrendDashboard
        title="用户活动趋势"
        description="按所选时间范围查看用户事件、活跃访客与购买事件。"
        dateRange={range}
        metrics={[{ label: "期间事件", value: totalEvents, note: "用户行为总量" }, { label: "识别用户", value: rows.length, note: "当前范围用户列表" }, { label: "购买事件", value: totalPurchases, note: "purchase 事件" }]}
        data={trend.map(({ date, events, visitors, purchases }) => ({ date, values: { events: Number(events), visitors: Number(visitors), purchases: Number(purchases) } }))}
        primaryTitle="用户事件趋势"
        primarySeries={[{ key: "events", label: "用户事件", color: "#315efb" }, { key: "visitors", label: "活跃用户", color: "#7184c7" }]}
        deviceData={devices}
        deviceValueLabel="用户事件"
      />
      <section className="workspace-section table-section">
        <div className="table-tools"><div><span className="eyebrow">USER JOURNEYS</span><h2 className="inline-section-title">用户活动摘要</h2></div><span className="table-total">共 {rows.length} 位用户</span></div>
        <UserTable rows={rows} rangeQuery={rangeQuery} />
      </section>
      <UserDistributionScatter rows={rows} />
    </div>
  );
}
