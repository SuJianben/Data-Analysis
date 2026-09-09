import { TimeSeriesChart, type ChartPoint, type ChartSeries } from "@/components/data-chart/time-series-chart";
import type { DateRange } from "@/features/date-range/date-range";
import { formatNumber } from "@/utils/format";

export type DashboardMetric = { label: string; value: number; note: string };

export function PageTrendDashboard({
  metrics,
  data,
  primarySeries,
  secondarySeries,
  dateRange,
  title,
  description,
  primaryTitle,
  secondaryTitle,
}: {
  metrics: DashboardMetric[];
  data: ChartPoint[];
  primarySeries: ChartSeries[];
  secondarySeries: ChartSeries[];
  dateRange: DateRange;
  title: string;
  description: string;
  primaryTitle: string;
  secondaryTitle: string;
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
        <section className="detail-chart-panel"><div className="section-heading"><div><span className="eyebrow">SECONDARY TREND</span><h3>{secondaryTitle}</h3></div><span className="chart-note">同一时间范围</span></div><TimeSeriesChart data={data} dateRange={dateRange} series={secondarySeries} ariaLabel={`${secondaryTitle}趋势图`} /></section>
      </div>
    </section>
  );
}
