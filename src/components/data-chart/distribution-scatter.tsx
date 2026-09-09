"use client";

import { useState } from "react";
import { formatNumber } from "@/utils/format";
import type { DistributionPoint } from "@/types/analytics";

export function DistributionScatter({ points, xLabel, yLabel, ariaLabel }: { points: DistributionPoint[]; xLabel: string; yLabel: string; ariaLabel: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 34, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  const mapped = points.map((point, index) => ({ ...point, index, xPosition: padding.left + (point.x / maxX) * plotWidth, yPosition: height - padding.bottom - (point.y / maxY) * plotHeight }));
  const activePoint = activeIndex === null ? null : mapped[activeIndex];

  if (!points.length) return <div className="chart-empty">当前范围暂无分布数据。</div>;
  return (
    <div className="scatter-wrap">
      <svg className="scatter-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {[0.25, 0.5, 0.75].map((line) => <line key={line} x1={padding.left} x2={width - padding.right} y1={height - padding.bottom - plotHeight * line} y2={height - padding.bottom - plotHeight * line} className="chart-grid" />)}
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} className="scatter-axis-line" />
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} className="scatter-axis-line" />
        {mapped.map((point) => <g key={point.id} className="scatter-point" onMouseEnter={() => setActiveIndex(point.index)} onMouseLeave={() => setActiveIndex(null)}><title>{`${point.label}：${point.x}，${point.y}`}</title><circle cx={point.xPosition} cy={point.yPosition} r={activeIndex === point.index ? 7 : 5} className={`scatter-dot scatter-dot-${point.category}`} /></g>)}
        <text x={padding.left} y={height - 10} className="scatter-axis-label">0</text><text x={width - padding.right} y={height - 10} textAnchor="end" className="scatter-axis-label">{formatNumber(maxX)}</text>
        <text x={padding.left - 8} y={height - padding.bottom + 4} textAnchor="end" className="scatter-axis-label">0</text><text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="scatter-axis-label">{formatNumber(maxY)}</text>
      </svg>
      {activePoint && <div className="scatter-tooltip" style={{ left: `${(activePoint.xPosition / width) * 100}%`, top: `${(activePoint.yPosition / height) * 100}%` }} role="status"><strong>{activePoint.label}</strong><span>{xLabel}：{formatNumber(activePoint.x)} · {yLabel}：{formatNumber(activePoint.y)}</span>{activePoint.details.map((detail) => <span key={detail}>{detail}</span>)}</div>}
      <div className="scatter-axis-copy"><span>横轴：{xLabel}</span><span>纵轴：{yLabel}</span></div>
      <div className="chart-legend">{new Set(points.map((point) => point.category)).has("default") && <span><i className="scatter-legend-dot scatter-dot-default" />数据项</span>}{new Set(points.map((point) => point.category)).has("visitor") && <span><i className="scatter-legend-dot scatter-dot-visitor" />匿名访客</span>}{new Set(points.map((point) => point.category)).has("customer") && <span><i className="scatter-legend-dot scatter-dot-customer" />登录客户</span>}</div>
    </div>
  );
}

export function DistributionScatterPanel({ title, description, points, xLabel, yLabel, pointUnit = "一项数据" }: { title: string; description: string; points: DistributionPoint[]; xLabel: string; yLabel: string; pointUnit?: string }) {
  return <section className="user-distribution-panel" aria-label={title}><div className="section-heading"><div><span className="eyebrow">DISTRIBUTION</span><h2>{title}</h2><p>{description}</p></div><span className="chart-note">每个点代表{pointUnit}</span></div><DistributionScatter points={points} xLabel={xLabel} yLabel={yLabel} ariaLabel={`${title}散点图`} /></section>;
}
