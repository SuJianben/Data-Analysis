import { GlobalClickTable } from "@/components/global-clicks/global-click-table";
import { PageTrendDashboard } from "@/components/data-chart/page-trend-dashboard";
import { loadGlobalClickReport, loadGlobalClickSummary, loadGlobalClickTrend } from "@/services/connectors/analytics";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";
import { DistributionScatterPanel } from "@/components/data-chart/distribution-scatter";
import { resolveGlobalClickQuery } from "@/features/report-pagination/global-click-query";

export default async function GlobalClicksPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const params = await searchParams;
  const range = resolveDateRange(params);
  const tableQuery = resolveGlobalClickQuery(params);
  const [report, summary, trend] = await Promise.all([
    loadGlobalClickReport({ ...range, ...tableQuery }),
    loadGlobalClickSummary(range),
    loadGlobalClickTrend(range),
  ]);
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
        metrics={[{ label: "期间点击", value: summary.totalClicks, note: "全局点击总量" }, { label: "点击元素", value: summary.elementCount, note: "当前范围有记录" }, { label: "涉及页面", value: summary.pageCount, note: "当前范围有记录" }]}
        data={trend.map(({ date, clicks, elements: elementCount, pages: pageCount }) => ({ date, values: { clicks: Number(clicks), elements: Number(elementCount), pages: Number(pageCount) } }))}
        primaryTitle="全局点击趋势"
        primarySeries={[{ key: "clicks", label: "全局点击", color: "#315efb" }]}
        deviceData={summary.devices}
        deviceValueLabel="全局点击"
      />
      <section className="workspace-section table-section">
        <GlobalClickTable rows={report.rows} pagination={report.pagination} query={tableQuery.query || ""} device={tableQuery.device || "all"} />
      </section>
      <DistributionScatterPanel title="点击元素分布气泡" description="按真实点击次数与页面覆盖范围查看元素分布；相同位置自动聚合。" xLabel="元素点击次数" yLabel="页面覆盖数" quadrantLabels={{ "high-high": "高点击·高覆盖", "low-high": "低点击·高覆盖", "high-low": "高点击·低覆盖", "low-low": "低点击·低覆盖" }} points={summary.distribution} mode="bubble-density" />
    </div>
  );
}
