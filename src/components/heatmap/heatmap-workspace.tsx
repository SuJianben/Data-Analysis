"use client";

import { useMemo, useState } from "react";
import type { HeatmapReportRow } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

const GRID_SIZE = 20;

function cellKey(x: number, y: number) {
  return "x" + x + "_y" + y;
}

function heatColor(value: number, max: number) {
  if (!value) return "transparent";
  const intensity = Math.max(0.12, Math.min(1, Math.log(value + 1) / Math.log(max + 1)));
  const hue = Math.round(220 - intensity * 220);
  return "hsl(" + hue + " 88% 54% / " + (0.18 + intensity * 0.72) + ")";
}

export function HeatmapWorkspace({ rows, paths }: { rows: HeatmapReportRow[]; paths: string[] }) {
  const [selectedPath, setSelectedPath] = useState(paths[0] || "");
  const pathRows = useMemo(
    () => rows.filter((row) => !selectedPath || row.pagePath === selectedPath),
    [rows, selectedPath],
  );
  const cells = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of pathRows) counts.set(row.heatmapCell, (counts.get(row.heatmapCell) || 0) + row.clickCount);
    return counts;
  }, [pathRows]);
  const max = Math.max(...cells.values(), 1);
  const total = pathRows.reduce((sum, row) => sum + row.clickCount, 0);
  const hotCells = [...cells.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <section className="workspace-section heatmap-section">
      <div className="heatmap-tools">
        <label className="search-field">
          <span>查看页面</span>
          <select value={selectedPath} onChange={(event) => setSelectedPath(event.target.value)}>
            {!paths.length && <option value="">等待页面点击数据</option>}
            {paths.map((path) => <option key={path} value={path}>{path}</option>)}
          </select>
        </label>
        <div className="heatmap-stat"><small>页面点击</small><strong>{formatNumber(total)}</strong></div>
        <div className="heatmap-stat"><small>热点网格</small><strong>{cells.size}</strong></div>
        <span className="table-total">20 × 20 页面坐标</span>
      </div>

      {!rows.length ? (
        <div className="heatmap-empty">
          <span>WAITING</span>
          <h2>等待真实点击数据</h2>
          <p>主题采集脚本已准备好；GA4 收到并同步热力事件后，这里会按页面显示点击热点。</p>
        </div>
      ) : (
        <div className="heatmap-layout">
          <div className="heatmap-visual">
            <div className="heatmap-axis-labels"><span>页面顶部</span><span>页面底部</span></div>
            <div className="heatmap-grid" role="img" aria-label={(selectedPath || "全部页面") + " 点击热力图"}>
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
                const x = index % GRID_SIZE;
                const y = Math.floor(index / GRID_SIZE);
                const count = cells.get(cellKey(x, y)) || 0;
                return (
                  <span
                    className="heatmap-cell"
                    key={cellKey(x, y)}
                    title={"网格 x" + x + " y" + y + "：" + formatNumber(count) + " 次"}
                    style={{ background: heatColor(count, max) }}
                  />
                );
              })}
            </div>
            <div className="heatmap-legend"><span>少</span><i /><span>多</span></div>
          </div>
          <aside className="heatmap-detail">
            <span className="eyebrow">HOTSPOTS</span>
            <h2>点击最集中的位置</h2>
            <div className="hotspot-list">
              {hotCells.map(([cell, count], index) => (
                <div className="hotspot-row" key={cell}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{cell.replace("_", " · ")}</strong>
                  <b>{formatNumber(count)}</b>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
