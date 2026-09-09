import type { ConversionFunnelPoint, DeviceBreakdownPoint, PageEntryPoint, TrafficTrendPoint } from "@/types/analytics";
import { datesInRange, type DateRange } from "@/features/date-range/date-range";
import { TrafficBarChart } from "@/components/dashboard/charts/traffic-bar-chart";
import { DeviceDonutChart } from "@/components/dashboard/charts/device-donut-chart";
import { ConversionFunnelChart } from "@/components/dashboard/charts/conversion-funnel-chart";
import { PageEntryChart } from "@/components/dashboard/charts/page-entry-chart";

export function DashboardCharts({
  trafficTrend,
  deviceBreakdown,
  funnel,
  topPages,
  dateRange,
}: {
  trafficTrend: TrafficTrendPoint[];
  deviceBreakdown: DeviceBreakdownPoint[];
  funnel: ConversionFunnelPoint[];
  topPages: PageEntryPoint[];
  dateRange: DateRange;
}) {
  const shortRange = datesInRange(dateRange).length <= 7;
  return (
    <section className="dashboard-charts" aria-label="站点数据图表">
      <section className="dashboard-chart-panel">
        <div className="section-heading"><div><span className="eyebrow">TRAFFIC OVERVIEW</span><h2>期间流量</h2></div><span className="chart-note">{shortRange ? "按日柱状" : "按时间段折线"}</span></div>
        <TrafficBarChart data={trafficTrend} dateRange={dateRange} />
      </section>
      <section className="dashboard-chart-panel">
        <div className="section-heading"><div><span className="eyebrow">DEVICE MIX</span><h2>设备构成</h2></div></div>
        <DeviceDonutChart data={deviceBreakdown} />
      </section>
      <section className="dashboard-chart-panel dashboard-chart-wide">
        <div className="section-heading"><div><span className="eyebrow">CONVERSION FUNNEL</span><h2>转化路径</h2></div><span className="chart-note">阶段转化率</span></div>
        <ConversionFunnelChart data={funnel} />
      </section>
      <section className="dashboard-chart-panel dashboard-chart-wide">
        <div className="section-heading"><div><span className="eyebrow">PAGE ENTRIES</span><h2>页面入口点击</h2></div></div>
        <PageEntryChart data={topPages} />
      </section>
    </section>
  );
}
