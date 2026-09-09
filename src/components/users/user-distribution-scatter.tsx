"use client";

import { useState } from "react";
import type { UserSummaryRow } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

function userLabel(row: UserSummaryRow) {
  const prefix = row.identityType === "customer" ? "登录客户" : "匿名访客";
  return `${prefix} ${row.identityId.slice(0, 8)}`;
}

export function UserDistributionScatter({ rows }: { rows: UserSummaryRow[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 34, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxEvents = Math.max(...rows.map((row) => Number(row.eventCount || 0)), 1);
  const maxPages = Math.max(...rows.map((row) => Number(row.pagesVisited || 0)), 1);
  const points = rows.map((row, index) => ({
    row,
    index,
    x: padding.left + (Number(row.eventCount || 0) / maxEvents) * plotWidth,
    y: height - padding.bottom - (Number(row.pagesVisited || 0) / maxPages) * plotHeight,
  }));
  const activePoint = activeIndex === null ? null : points[activeIndex];

  if (!rows.length) return <div className="chart-empty">当前范围暂无用户分布数据。</div>;

  return (
    <div className="scatter-wrap">
      <svg className="scatter-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="用户活跃度与访问页面数分布散点图">
        {[0.25, 0.5, 0.75].map((line) => <line key={line} x1={padding.left} x2={width - padding.right} y1={height - padding.bottom - plotHeight * line} y2={height - padding.bottom - plotHeight * line} className="chart-grid" />)}
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} className="scatter-axis-line" />
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} className="scatter-axis-line" />
        {points.map(({ row, index, x, y }) => (
          <g key={row.identityKey} className="scatter-point" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
            <title>{`${userLabel(row)}：${formatNumber(row.eventCount)} 个事件，${formatNumber(row.pagesVisited)} 个页面`}</title>
            <circle cx={x} cy={y} r={activeIndex === index ? 7 : 5} className={row.identityType === "customer" ? "scatter-dot scatter-dot-customer" : "scatter-dot"} />
          </g>
        ))}
        <text x={padding.left} y={height - 10} className="scatter-axis-label">0</text>
        <text x={width - padding.right} y={height - 10} textAnchor="end" className="scatter-axis-label">{formatNumber(maxEvents)}</text>
        <text x={padding.left - 8} y={height - padding.bottom + 4} textAnchor="end" className="scatter-axis-label">0</text>
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="scatter-axis-label">{formatNumber(maxPages)}</text>
      </svg>
      {activePoint && (
        <div className="scatter-tooltip" style={{ left: `${(activePoint.x / width) * 100}%`, top: `${(activePoint.y / height) * 100}%` }} role="status">
          <strong>{userLabel(activePoint.row)}</strong>
          <span>事件 {formatNumber(activePoint.row.eventCount)} · 页面 {formatNumber(activePoint.row.pagesVisited)}</span>
          <span>购买 {formatNumber(activePoint.row.purchaseCount)}</span>
        </div>
      )}
      <div className="scatter-axis-copy"><span>横轴：用户事件数（活跃度）</span><span>纵轴：访问页面数（覆盖范围）</span></div>
      <div className="chart-legend"><span><i className="scatter-legend-dot" />匿名访客</span><span><i className="scatter-legend-dot scatter-legend-dot-customer" />登录客户</span></div>
    </div>
  );
}
