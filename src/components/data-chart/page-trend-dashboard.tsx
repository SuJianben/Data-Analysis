import { TimeSeriesChart, type ChartPoint, type ChartSeries } from "@/components/data-chart/time-series-chart";
import { DeviceDonutChart } from "@/components/dashboard/charts/device-donut-chart";
import type { DateRange } from "@/features/date-range/date-range";
import type { DeviceStatPoint } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

export type DashboardMetric = { label: string; value: number; note: string };

export function PageTrendDashboard({
  metrics,
  data,
  primarySeries,
  deviceData,
  deviceValueLabel,
  dateRange,
  title,
  description,
  primaryTitle,
}: {
  metrics: DashboardMetric[];
  data: ChartPoint[];
  primarySeries: ChartSeries[];
  deviceData: DeviceStatPoint[];
  deviceValueLabel: string;
  dateRange: DateRange;
  title: string;
  description: string;
  primaryTitle: string;
}) {
  return (
    <section className="detail-dashboard" aria-label={title}>
      <div className="detail-dashboard-heading">
        <div><span className="eyebrow">SELECTED PERIOD</span><h2>{title}</h2><p>{description}</p></div>
        <span className="chart-note">{dateRange.startDate} – {dateRange.endDate}</span>
      </div>
      <div className="detail-metric-strip">
        {metrics.map((metric) => <div className="detail-metric" key={metric.label}><span>{metric.label}</span><strong>{formatNumber(metric.value)}</strong><small>{metric.note}</small></div>)}
      </div>
      <div className="detail-chart-grid">
        <section className="detail-chart-panel"><div className="section-heading"><div><span className="eyebrow">PRIMARY TREND</span><h3>{primaryTitle}</h3></div><span className="chart-note">{dateRange.startDate} – {dateRange.endDate}</span></div><TimeSeriesChart data={data} dateRange={dateRange} series={primarySeries} ariaLabel={`${primaryTitle}趋势图`} /></section>
        <section className="detail-chart-panel"><div className="section-heading"><div><span className="eyebrow">DEVICE MIX</span><h3>设备构成</h3></div><span className="chart-note">同一时间范围</span></div><DeviceDonutChart data={deviceData} centerLabel={deviceValueLabel} /></section>
      </div>
    </section>
  );
}
