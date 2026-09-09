import { TimeSeriesChart, type ChartPoint, type ChartSeries } from "@/components/data-chart/time-series-chart";
import type { DateRange } from "@/features/date-range/date-range";
import { formatNumber } from "@/utils/format";

export type DashboardMetric = { label: string; value: number; note: string };

export function PageTrendDashboard({
  metrics,
  data,
  series,
  dateRange,
  title,
  description,
}: {
  metrics: DashboardMetric[];
  data: ChartPoint[];
  series: ChartSeries[];
  dateRange: DateRange;
  title: string;
  description: string;
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
      <div className="detail-chart-panel"><TimeSeriesChart data={data} dateRange={dateRange} series={series} ariaLabel={`${title}趋势图`} /></div>
    </section>
  );
}
