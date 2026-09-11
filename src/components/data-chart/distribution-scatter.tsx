"use client";

import { useState } from "react";
import { formatNumber } from "@/utils/format";
import { rankDistributionPoints, type DistributionQuadrant } from "@/utils/distribution-scale";
import type { DistributionPoint } from "@/types/analytics";

const quadrantColors: Record<DistributionQuadrant, string> = { "high-high": "#43a889", "low-high": "#3eaec4", "high-low": "#d98a2c", "low-low": "#aeb8c6" };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function DistributionScatter({ points, xLabel, yLabel, ariaLabel, quadrantLabels }: { points: DistributionPoint[]; xLabel: string; yLabel: string; ariaLabel: string; quadrantLabels: Record<DistributionQuadrant, string> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 34, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const midpointXPosition = padding.left + plotWidth / 2;
  const midpointYPosition = padding.top + plotHeight / 2;
  const collisionCounts = new Map<string, number>();
  const mapped = rankDistributionPoints(points).map((point) => {
    const collisionKey = `${point.xRank.toFixed(6)}:${point.yRank.toFixed(6)}`;
    const collisionIndex = collisionCounts.get(collisionKey) ?? 0;
    collisionCounts.set(collisionKey, collisionIndex + 1);

    const angle = collisionIndex * 2.399963;
    const radius = collisionIndex === 0 ? 0 : Math.min(22, 4 + Math.sqrt(collisionIndex) * 3);
    const quadrantXBounds = point.xRank >= 0.5
      ? [midpointXPosition + 6, width - padding.right - 6]
      : [padding.left + 6, midpointXPosition - 6];
    const quadrantYBounds = point.yRank >= 0.5
      ? [padding.top + 6, midpointYPosition - 6]
      : [midpointYPosition + 6, height - padding.bottom - 6];
    const baseX = padding.left + point.xRank * plotWidth;
    const baseY = height - padding.bottom - point.yRank * plotHeight;

    return {
      ...point,
      xPosition: clamp(baseX + Math.cos(angle) * radius, quadrantXBounds[0], quadrantXBounds[1]),
      yPosition: clamp(baseY + Math.sin(angle) * radius, quadrantYBounds[0], quadrantYBounds[1]),
    };
  });
  const activePoint = activeIndex === null ? null : mapped[activeIndex];

  if (!points.length) return <div className="chart-empty">当前范围暂无分布数据。</div>;
  return (
    <div className="scatter-wrap">
      <div className="chart-legend scatter-legend-top"><span><i className="scatter-legend-dot scatter-dot-high-high" />{quadrantLabels["high-high"]}</span><span><i className="scatter-legend-dot scatter-dot-low-high" />{quadrantLabels["low-high"]}</span><span><i className="scatter-legend-dot scatter-dot-high-low" />{quadrantLabels["high-low"]}</span><span><i className="scatter-legend-dot scatter-dot-low-low" />{quadrantLabels["low-low"]}</span></div>
      <svg className="scatter-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <rect x={padding.left} y={padding.top} width={plotWidth / 2} height={plotHeight / 2} fill="#3eaec4" opacity=".08" />
        <rect x={midpointXPosition} y={padding.top} width={plotWidth / 2} height={plotHeight / 2} fill="#43a889" opacity=".08" />
        <rect x={padding.left} y={midpointYPosition} width={plotWidth / 2} height={plotHeight / 2} fill="#aeb8c6" opacity=".09" />
        <rect x={midpointXPosition} y={midpointYPosition} width={plotWidth / 2} height={plotHeight / 2} fill="#d98a2c" opacity=".08" />
        {[0.25, 0.5, 0.75].map((line) => <line key={line} x1={padding.left} x2={width - padding.right} y1={height - padding.bottom - plotHeight * line} y2={height - padding.bottom - plotHeight * line} className="chart-grid" />)}
        <line x1={midpointXPosition} x2={midpointXPosition} y1={padding.top} y2={height - padding.bottom} className="scatter-reference" />
        <line x1={padding.left} x2={width - padding.right} y1={midpointYPosition} y2={midpointYPosition} className="scatter-reference" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} className="scatter-axis-line" />
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} className="scatter-axis-line" />
        <text x={padding.left + 6} y={padding.top + 12} className="scatter-quadrant-label">{quadrantLabels["low-high"]}</text>
        <text x={width - padding.right - 6} y={padding.top + 12} textAnchor="end" className="scatter-quadrant-label">{quadrantLabels["high-high"]}</text>
        <text x={padding.left + 6} y={height - padding.bottom - 7} className="scatter-quadrant-label">{quadrantLabels["low-low"]}</text>
        <text x={width - padding.right - 6} y={height - padding.bottom - 7} textAnchor="end" className="scatter-quadrant-label">{quadrantLabels["high-low"]}</text>
        {mapped.map((point) => <g key={point.id} className="scatter-point" onMouseEnter={() => setActiveIndex(point.index)} onMouseLeave={() => setActiveIndex(null)}><title>{`${point.label}：${xLabel} ${formatNumber(point.x)}，${yLabel} ${formatNumber(point.y)}`}</title><circle cx={point.xPosition} cy={point.yPosition} r={activeIndex === point.index ? 7 : 5} style={{ fill: quadrantColors[point.quadrant] }} className="scatter-dot" data-quadrant={point.quadrant} /></g>)}
        <text x={padding.left} y={height - 10} className="scatter-axis-label">低</text><text x={width - padding.right} y={height - 10} textAnchor="end" className="scatter-axis-label">高</text>
        <text x={padding.left - 8} y={height - padding.bottom + 4} textAnchor="end" className="scatter-axis-label">低</text><text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="scatter-axis-label">高</text>
      </svg>
      {activePoint && <div className="scatter-tooltip" style={{ left: `${(activePoint.xPosition / width) * 100}%`, top: `${(activePoint.yPosition / height) * 100}%` }} role="status"><strong>{activePoint.label}</strong><span>{xLabel}：{formatNumber(activePoint.x)} · {yLabel}：{formatNumber(activePoint.y)}</span>{activePoint.details.map((detail) => <span key={detail}>{detail}</span>)}</div>}
      <div className="scatter-axis-copy"><span>横轴：{xLabel}（相对排名）</span><span>纵轴：{yLabel}（相对排名）</span></div>
    </div>
  );
}

export function DistributionScatterPanel({ title, description, points, xLabel, yLabel, quadrantLabels, pointUnit = "一项数据" }: { title: string; description: string; points: DistributionPoint[]; xLabel: string; yLabel: string; quadrantLabels: Record<DistributionQuadrant, string>; pointUnit?: string }) {
  return <section className="user-distribution-panel" aria-label={title}><div className="section-heading"><div><span className="eyebrow">DISTRIBUTION</span><h2>{title}</h2><p>{description}</p></div><span className="chart-note">虚线为排名中位线 · 每个点代表{pointUnit}</span></div><DistributionScatter points={points} xLabel={xLabel} yLabel={yLabel} quadrantLabels={quadrantLabels} ariaLabel={`${title}散点图`} /></section>;
}
