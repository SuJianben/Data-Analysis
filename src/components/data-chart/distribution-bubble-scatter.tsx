"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { formatNumber } from "@/utils/format";
import { buildDistributionBubbles, resolveBubbleRadius } from "@/utils/distribution-bubbles";
import type { DistributionQuadrant } from "@/utils/distribution-scale";
import type { DistributionPoint } from "@/types/analytics";

const quadrantColors: Record<DistributionQuadrant, string> = { "high-high": "#43a889", "low-high": "#3eaec4", "high-low": "#d98a2c", "low-low": "#aeb8c6" };

export function DistributionBubbleScatter({ points, xLabel, yLabel, ariaLabel, quadrantLabels }: { points: DistributionPoint[]; xLabel: string; yLabel: string; ariaLabel: string; quadrantLabels: Record<DistributionQuadrant, string> }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const scale = useMemo(() => buildDistributionBubbles(points), [points]);
  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 34, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const midpointXPosition = padding.left + plotWidth / 2;
  const midpointYPosition = padding.top + plotHeight / 2;
  const mapped = scale.points.map((point) => ({
    ...point,
    xPosition: padding.left + point.xRatio * plotWidth,
    yPosition: height - padding.bottom - point.yRatio * plotHeight,
  }));
  const activePoint = mapped.find((point) => point.id === activeId) ?? null;

  if (!points.length) return <div className="chart-empty">当前范围暂无分布数据。</div>;

  const tooltipStyle = activePoint ? {
    left: `${(activePoint.xPosition / width) * 100}%`,
    top: `${(activePoint.yPosition / height) * 100}%`,
    transform: `translate(${activePoint.xRatio > 0.78 ? "-100%" : activePoint.xRatio < 0.22 ? "0" : "-50%"}, ${activePoint.yRatio > 0.72 ? "12px" : "calc(-100% - 12px)"})`,
  } satisfies CSSProperties : undefined;

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
        <text x={padding.left + 6} y={midpointYPosition + 14} className="scatter-quadrant-label">{quadrantLabels["low-low"]}</text>
        <text x={width - padding.right - 6} y={midpointYPosition + 14} textAnchor="end" className="scatter-quadrant-label">{quadrantLabels["high-low"]}</text>
        {mapped.map((point) => {
          const radius = resolveBubbleRadius(point.count);
          const isActive = activeId === point.id;
          return <g key={point.id} className="scatter-point" onMouseEnter={() => setActiveId(point.id)} onMouseLeave={() => setActiveId(null)}><title>{`${point.count} 个元素：${xLabel} ${formatNumber(point.x)}，${yLabel} ${formatNumber(point.y)}`}</title><circle cx={point.xPosition} cy={point.yPosition} r={isActive ? radius + 2 : radius} style={{ fill: quadrantColors[point.quadrant] }} className="scatter-dot scatter-bubble" data-quadrant={point.quadrant} />{point.count > 1 && <text x={point.xPosition} y={point.yPosition + 3} textAnchor="middle" className="scatter-bubble-count">{formatNumber(point.count)}</text>}</g>;
        })}
        <text x={padding.left} y={height - 10} className="scatter-axis-label">{formatNumber(scale.xMinimum)}</text><text x={width - padding.right} y={height - 10} textAnchor="end" className="scatter-axis-label">{formatNumber(scale.xMaximum)}</text>
        <text x={padding.left - 8} y={height - padding.bottom + 4} textAnchor="end" className="scatter-axis-label">{formatNumber(scale.yMinimum)}</text><text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="scatter-axis-label">{formatNumber(scale.yMaximum)}</text>
      </svg>
      {activePoint && <div className="scatter-tooltip scatter-bubble-tooltip" style={tooltipStyle} role="status"><strong>{activePoint.count > 1 ? `${formatNumber(activePoint.count)} 个元素位于此处` : activePoint.labels[0]}</strong><span>{xLabel}：{formatNumber(activePoint.x)} · {yLabel}：{formatNumber(activePoint.y)}</span>{activePoint.count > 1 && <span>示例：{activePoint.labels.slice(0, 3).join("、")}</span>}{activePoint.count === 1 && activePoint.details.slice(0, 2).map((detail) => <span key={detail}>{detail}</span>)}</div>}
      <div className="scatter-axis-copy"><span>横轴：{xLabel}（{formatNumber(scale.xMinimum)}–{formatNumber(scale.xMaximum)}，对数刻度）</span><span>纵轴：{yLabel}（{formatNumber(scale.yMinimum)}–{formatNumber(scale.yMaximum)}，对数刻度）</span></div>
    </div>
  );
}
