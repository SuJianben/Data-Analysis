"use client";

import { useState } from "react";
import { formatNumber } from "@/utils/format";
import type { DistributionPoint } from "@/types/analytics";

type Quadrant = "high-high" | "low-high" | "high-low" | "low-low";
const quadrantColors: Record<Quadrant, string> = { "high-high": "#43a889", "low-high": "#3eaec4", "high-low": "#d98a2c", "low-low": "#aeb8c6" };

export function DistributionScatter({ points, xLabel, yLabel, ariaLabel, quadrantLabels }: { points: DistributionPoint[]; xLabel: string; yLabel: string; ariaLabel: string; quadrantLabels: Record<Quadrant, string> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 34, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  const averageX = points.length ? points.reduce((sum, point) => sum + point.x, 0) / points.length : 0;
  const averageY = points.length ? points.reduce((sum, point) => sum + point.y, 0) / points.length : 0;
  const averageXPosition = padding.left + (averageX / maxX) * plotWidth;
  const averageYPosition = height - padding.bottom - (averageY / maxY) * plotHeight;
  const quadrantOf = (point: DistributionPoint): Quadrant => point.x >= averageX ? (point.y >= averageY ? "high-high" : "high-low") : (point.y >= averageY ? "low-high" : "low-low");
  const mapped = points.map((point, index) => ({ ...point, index, xPosition: padding.left + (point.x / maxX) * plotWidth, yPosition: height - padding.bottom - (point.y / maxY) * plotHeight }));
  const activePoint = activeIndex === null ? null : mapped[activeIndex];

  if (!points.length) return <div className="chart-empty">当前范围暂无分布数据。</div>;
  return (
    <div className="scatter-wrap">
      <div className="chart-legend scatter-legend-top"><span><i className="scatter-legend-dot scatter-dot-high-high" />{quadrantLabels["high-high"]}</span><span><i className="scatter-legend-dot scatter-dot-low-high" />{quadrantLabels["low-high"]}</span><span><i className="scatter-legend-dot scatter-dot-high-low" />{quadrantLabels["high-low"]}</span><span><i className="scatter-legend-dot scatter-dot-low-low" />{quadrantLabels["low-low"]}</span></div>
      <svg className="scatter-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <rect x={padding.left} y={padding.top} width={averageXPosition - padding.left} height={averageYPosition - padding.top} fill="#3eaec4" opacity=".08" />
        <rect x={averageXPosition} y={padding.top} width={width - padding.right - averageXPosition} height={averageYPosition - padding.top} fill="#43a889" opacity=".08" />
        <rect x={padding.left} y={averageYPosition} width={averageXPosition - padding.left} height={height - padding.bottom - averageYPosition} fill="#aeb8c6" opacity=".09" />
        <rect x={averageXPosition} y={averageYPosition} width={width - padding.right - averageXPosition} height={height - padding.bottom - averageYPosition} fill="#d98a2c" opacity=".08" />
        {[0.25, 0.5, 0.75].map((line) => <line key={line} x1={padding.left} x2={width - padding.right} y1={height - padding.bottom - plotHeight * line} y2={height - padding.bottom - plotHeight * line} className="chart-grid" />)}
        <line x1={averageXPosition} x2={averageXPosition} y1={padding.top} y2={height - padding.bottom} className="scatter-reference" />
        <line x1={padding.left} x2={width - padding.right} y1={averageYPosition} y2={averageYPosition} className="scatter-reference" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} className="scatter-axis-line" />
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} className="scatter-axis-line" />
        <text x={padding.left + 6} y={padding.top + 12} className="scatter-quadrant-label">{quadrantLabels["low-high"]}</text>
        <text x={width - padding.right - 6} y={padding.top + 12} textAnchor="end" className="scatter-quadrant-label">{quadrantLabels["high-high"]}</text>
        <text x={padding.left + 6} y={height - padding.bottom - 7} className="scatter-quadrant-label">{quadrantLabels["low-low"]}</text>
        <text x={width - padding.right - 6} y={height - padding.bottom - 7} textAnchor="end" className="scatter-quadrant-label">{quadrantLabels["high-low"]}</text>
        {mapped.map((point) => <g key={point.id} className="scatter-point" onMouseEnter={() => setActiveIndex(point.index)} onMouseLeave={() => setActiveIndex(null)}><title>{`${point.label}：${point.x}，${point.y}`}</title><circle cx={point.xPosition} cy={point.yPosition} r={activeIndex === point.index ? 7 : 5} fill={quadrantColors[quadrantOf(point)]} className="scatter-dot" /></g>)}
        <text x={padding.left} y={height - 10} className="scatter-axis-label">0</text><text x={width - padding.right} y={height - 10} textAnchor="end" className="scatter-axis-label">{formatNumber(maxX)}</text>
        <text x={padding.left - 8} y={height - padding.bottom + 4} textAnchor="end" className="scatter-axis-label">0</text><text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="scatter-axis-label">{formatNumber(maxY)}</text>
      </svg>
      {activePoint && <div className="scatter-tooltip" style={{ left: `${(activePoint.xPosition / width) * 100}%`, top: `${(activePoint.yPosition / height) * 100}%` }} role="status"><strong>{activePoint.label}</strong><span>{xLabel}：{formatNumber(activePoint.x)} · {yLabel}：{formatNumber(activePoint.y)}</span>{activePoint.details.map((detail) => <span key={detail}>{detail}</span>)}</div>}
      <div className="scatter-axis-copy"><span>横轴：{xLabel}</span><span>纵轴：{yLabel}</span></div>
    </div>
  );
}

export function DistributionScatterPanel({ title, description, points, xLabel, yLabel, quadrantLabels, pointUnit = "一项数据" }: { title: string; description: string; points: DistributionPoint[]; xLabel: string; yLabel: string; quadrantLabels: Record<Quadrant, string>; pointUnit?: string }) {
  return <section className="user-distribution-panel" aria-label={title}><div className="section-heading"><div><span className="eyebrow">DISTRIBUTION</span><h2>{title}</h2><p>{description}</p></div><span className="chart-note">虚线为当前范围平均值 · 每个点代表{pointUnit}</span></div><DistributionScatter points={points} xLabel={xLabel} yLabel={yLabel} quadrantLabels={quadrantLabels} ariaLabel={`${title}散点图`} /></section>;
}
