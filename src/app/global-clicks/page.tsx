import { GlobalClickTable } from "@/components/global-clicks/global-click-table";
import { PageTrendDashboard } from "@/components/data-chart/page-trend-dashboard";
import { loadGlobalClickReport, loadGlobalClickTrend } from "@/services/connectors/analytics";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";
import { aggregateDeviceStats } from "@/utils/device-stats";

export const dynamic = "force-dynamic";

export default async function GlobalClicksPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const range = resolveDateRange(await searchParams);
  const [{ rows }, trend] = await Promise.all([loadGlobalClickReport(range), loadGlobalClickTrend(range)]);
  const elements = new Set(rows.map((row) => row.elementKey.trim()).filter(Boolean));
  const pages = new Set(rows.map((row) => row.pagePath.trim()).filter(Boolean));
  const totalClicks = trend.reduce((sum, point) => sum + Number(point.clicks || 0), 0);
  const devices = aggregateDeviceStats(rows, (row) => row.deviceCategory, (row) => row.clickCount);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div>
          <span className="section-number">03 / INTERACTIONS</span>
          <h1>全局点击埋点</h1>
          <p>统一查看链接、按钮和交互控件的真实点击数据。</p>
        </div>
      </header>
      <PageTrendDashboard
        title="全局点击趋势"
        description="按所选时间范围查看全站点击量、被点击元素和涉及页面。"
        dateRange={range}
        metrics={[{ label: "期间点击", value: totalClicks, note: "全局点击总量" }, { label: "点击元素", value: elements.size, note: "当前范围有记录" }, { label: "涉及页面", value: pages.size, note: "当前范围有记录" }]}
        data={trend.map(({ date, clicks, elements: elementCount, pages: pageCount }) => ({ date, values: { clicks: Number(clicks), elements: Number(elementCount), pages: Number(pageCount) } }))}
        primaryTitle="全局点击趋势"
        primarySeries={[{ key: "clicks", label: "全局点击", color: "#315efb" }]}
        deviceData={devices}
        deviceValueLabel="全局点击"
      />
      <section className="workspace-section table-section">
        <GlobalClickTable rows={rows} />
      </section>
    </div>
  );
}
