"use client";

import { useState } from "react";
import type { TrendPoint } from "@/types/analytics";
import { datesInRange, type DateRange } from "@/features/date-range/date-range";
import { formatNumber } from "@/utils/format";

function formatChartDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function TrendChart({ data, dateRange }: { data: TrendPoint[]; dateRange: DateRange }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 250;
  const padding = 24;
  const clicksByDate = new Map(data.map((item) => [item.date, item.clicks]));
  const completeData = datesInRange(dateRange).map((date) => ({ date, clicks: clicksByDate.get(date) || 0 }));
  const max = Math.max(...completeData.map((item) => item.clicks), 1);
  const min = 0;
  const range = Math.max(max - min, 1);
  const points = completeData.map((item, index) => {
    const x = padding + (index / Math.max(completeData.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((item.clicks - min) / range) * (height - padding * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = points.length ? `${path} L${points.at(-1)?.x},${height - padding} L${points[0].x},${height - padding} Z` : "";
  const axisDates = completeData.length > 2
    ? [completeData[0], completeData[Math.floor((completeData.length - 1) / 2)], completeData.at(-1)]
    : completeData;
  const activePoint = activeIndex === null ? null : points[activeIndex];

  return (
    <div className="chart-wrap">
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="菜单点击趋势图">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#315efb" stopOpacity="0.2" />
            <stop offset="1" stopColor="#315efb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((line) => (
          <line key={line} x1={padding} x2={width - padding} y1={height * line} y2={height * line} className="chart-grid" />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={path} className="chart-line" />
        {activePoint && <line className="chart-guide" x1={activePoint.x} x2={activePoint.x} y1={padding} y2={height - padding} />}
        {points.map((point, index) => (
          <g
            className={`chart-point ${activeIndex === index ? "is-active" : ""}`}
            key={point.date}
            tabIndex={0}
            role="button"
            aria-label={`${formatChartDate(point.date)}，${formatNumber(point.clicks)} 次点击`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          >
            <circle className="chart-point-dot" cx={point.x} cy={point.y} r={completeData.length > 45 ? 2 : 3} />
            <circle className="chart-point-hit" cx={point.x} cy={point.y} r="9" />
          </g>
        ))}
      </svg>
      {activePoint && (
        <div
          className="chart-tooltip"
          style={{ left: `${(activePoint.x / width) * 100}%`, top: `${(activePoint.y / height) * 100}%` }}
          role="status"
        >
          <span>{formatChartDate(activePoint.date)}</span>
          <strong>{formatNumber(activePoint.clicks)} 次点击</strong>
        </div>
      )}
      <div className="chart-axis">
        {axisDates.map((item) => <span key={item?.date}>{item?.date.slice(5)}</span>)}
      </div>
    </div>
  );
}
