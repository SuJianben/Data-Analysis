"use client";

import { useState } from "react";
import { datesInRange, type DateRange } from "@/features/date-range/date-range";
import type { TrafficTrendPoint } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

const series = [
  { key: "pageViews" as const, label: "页面浏览", color: "#315efb" },
  { key: "users" as const, label: "访问用户", color: "#7184c7" },
  { key: "sessions" as const, label: "会话", color: "#9ca4b8" },
];

function formatDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export function TrafficBarChart({ data, dateRange }: { data: TrafficTrendPoint[]; dateRange: DateRange }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const byDate = new Map(data.map((item) => [item.date, item]));
  const points = datesInRange(dateRange).map((date) => ({
    date,
    pageViews: Number(byDate.get(date)?.pageViews || 0),
    users: Number(byDate.get(date)?.users || 0),
    sessions: Number(byDate.get(date)?.sessions || 0),
  }));
  const width = 760;
  const height = 250;
  const padding = 26;
  const chartHeight = height - padding * 2;
  const groupWidth = (width - padding * 2) / Math.max(points.length, 1);
  const visibleSeries = series.filter(({ key }) => points.some((point) => point[key] > 0));
  const barWidth = Math.max(Math.min(groupWidth / Math.max(visibleSeries.length + 1, 2), 12), 2);
  const max = Math.max(...points.flatMap((point) => visibleSeries.map(({ key }) => point[key])), 1);
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const axisStep = points.length <= 14 ? 1 : points.length <= 31 ? 5 : 15;
  const axisLabels = points.map((point, index) => ({
    ...point,
    visible: index === 0 || index === points.length - 1 || index % axisStep === 0,
  }));

  if (!data.length || !visibleSeries.length) return <div className="chart-empty">当前范围暂无流量数据。</div>;

  return (
    <div className="chart-wrap">
      <svg className="dashboard-chart traffic-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="流量趋势柱状图">
        {[0.25, 0.5, 0.75].map((line) => (
          <line key={line} x1={padding} x2={width - padding} y1={height - padding - chartHeight * line} y2={height - padding - chartHeight * line} className="chart-grid" />
        ))}
        {points.map((point, index) => {
          const x = padding + index * groupWidth + groupWidth / 2;
          return (
            <g key={point.date} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
              <title>{`${formatDate(point.date)}：${visibleSeries.map(({ key, label }) => `${label} ${formatNumber(point[key])}`).join("，")}`}</title>
              {visibleSeries.map(({ key, color }, seriesIndex) => {
                const value = point[key];
                const barHeight = (value / max) * chartHeight;
                return <rect key={key} x={x + (seriesIndex - 1) * barWidth} y={height - padding - barHeight} width={Math.max(barWidth - 1, 1)} height={barHeight} rx="1" fill={color} opacity={activeIndex === null || activeIndex === index ? 1 : .55} />;
              })}
            </g>
          );
        })}
      </svg>
      {activePoint && (
        <div className="chart-tooltip" style={{ left: `${((padding + activeIndex! * groupWidth + groupWidth / 2) / width) * 100}%`, top: "18%" }} role="status">
          <span>{formatDate(activePoint.date)}</span>
          {visibleSeries.map(({ key, label }) => <strong key={key}>{label} {formatNumber(activePoint[key])}</strong>)}
        </div>
      )}
      <div className="chart-axis traffic-axis" style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))` }}>
        {axisLabels.map((point) => <span className={point.visible ? "" : "is-hidden"} key={point.date}>{formatDate(point.date)}</span>)}
      </div>
      <div className="chart-legend">{visibleSeries.map(({ label, color }) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>
    </div>
  );
}
