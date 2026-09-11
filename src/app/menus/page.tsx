import { MenuTable } from "@/components/menus/menu-table";
import { PageTrendDashboard } from "@/components/data-chart/page-trend-dashboard";
import { loadMenuReportRows, loadMenuTrend } from "@/services/connectors/analytics";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";
import { aggregateDeviceStats } from "@/utils/device-stats";
import { DistributionScatterPanel } from "@/components/data-chart/distribution-scatter";
import { buildMenuDistributionPoints } from "@/utils/distribution-points";

export default async function MenusPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const range = resolveDateRange(await searchParams);
  const [rows, trend] = await Promise.all([loadMenuReportRows(range), loadMenuTrend(range)]);
  const menuNames = new Set(rows.map((row) => row.menuName.trim()).filter(Boolean));
  const totalClicks = trend.reduce((sum, point) => sum + Number(point.clicks || 0), 0);
  const devices = aggregateDeviceStats(rows, (row) => row.deviceCategory, (row) => row.clickCount);
  const scatterPoints = buildMenuDistributionPoints(rows);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading"><div><span className="section-number">02 / NAVIGATION</span><h1>菜单点击分析</h1><p>按菜单、层级、行为和设备检查导航使用情况。</p></div></header>
      <PageTrendDashboard
        title="菜单使用趋势"
        description="按所选时间范围查看菜单点击量与每日有点击的菜单数量。"
        dateRange={range}
        metrics={[{ label: "期间点击", value: totalClicks, note: "菜单点击总量" }, { label: "识别菜单", value: menuNames.size, note: "当前范围有记录" }, { label: "有数据天数", value: trend.filter((point) => Number(point.clicks) > 0).length, note: "至少 1 次点击" }]}
        data={trend.map(({ date, clicks, menus }) => ({ date, values: { clicks: Number(clicks), menus: Number(menus) } }))}
        primaryTitle="菜单点击趋势"
        primarySeries={[{ key: "clicks", label: "菜单点击", color: "#315efb" }]}
        deviceData={devices}
        deviceValueLabel="菜单点击"
      />
      <section className="workspace-section table-section">
        <MenuTable rows={rows} />
      </section>
      <DistributionScatterPanel title="菜单分布散点" description="按当前时间范围内的菜单点击次数与设备覆盖范围查看菜单分布。" xLabel="菜单点击次数" yLabel="设备覆盖数" quadrantLabels={{ "high-high": "高点击·高覆盖", "low-high": "低点击·高覆盖", "high-low": "高点击·低覆盖", "low-low": "低点击·低覆盖" }} pointUnit="一个菜单" points={scatterPoints} />
    </div>
  );
}
