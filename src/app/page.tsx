import Link from "next/link";
import { DemoLoader } from "@/components/dashboard/demo-loader";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { MetricStrip } from "@/components/dashboard/metric-strip";
import { SyncList } from "@/components/dashboard/sync-list";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { loadDashboardOverview } from "@/services/connectors/analytics";
import { dateRangeQuery, resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";
import { formatNumber } from "@/utils/format";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const range = resolveDateRange(await searchParams);
  const rangeQuery = dateRangeQuery(range);
  const { summary, trend, trafficTrend, funnel, deviceBreakdown, topPages, topMenus, recentSyncRuns: runs } = await loadDashboardOverview(range);
  const hasData = summary.clicks > 0;
  const topMax = Math.max(...topMenus.map((menu) => menu.clickCount), 1);
  return (
    <div className="page page-enter">
      <header className="page-heading">
        <div><span className="section-number">01 / OVERVIEW</span><h1>站点数据概览</h1><p>统一查看菜单互动、流量与销售指标。</p></div>
        <div className="freshness"><span className="status-dot" /><div><small>数据状态</small><strong>{hasData ? "已有可分析数据" : "等待首次导入"}</strong></div></div>
      </header>
      {!hasData ? <DemoLoader /> : (
        <>
          <MetricStrip summary={summary} />
          <DashboardCharts trafficTrend={trafficTrend} funnel={funnel} deviceBreakdown={deviceBreakdown} topPages={topPages} dateRange={range} />
          <div className="overview-grid">
            <section className="workspace-section chart-section">
              <div className="section-heading"><div><span className="eyebrow">SELECTED PERIOD</span><h2>菜单点击趋势</h2></div><Link href={`/menus?${rangeQuery}`}>查看菜单明细 →</Link></div>
              <TrendChart data={trend} dateRange={range} />
            </section>
            <section className="workspace-section ranking-section">
              <div className="section-heading"><div><span className="eyebrow">TOP ENTRY</span><h2>高频菜单</h2></div></div>
              <div className="rank-list">
                {topMenus.map((menu, index) => (
                  <div className="rank-row" key={`${menu.menuKey}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{menu.menuName}</strong><small>{menu.parentMenuName || "一级菜单"}</small><i style={{ width: `${(menu.clickCount / topMax) * 100}%` }} /></div>
                    <b>{formatNumber(menu.clickCount)}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className="workspace-section sync-section"><div className="section-heading"><div><span className="eyebrow">DATA LINEAGE</span><h2>最近同步</h2></div></div><SyncList runs={runs} /></section>
        </>
      )}
    </div>
  );
}
