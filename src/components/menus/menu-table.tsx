"use client";

import { useMemo, useState } from "react";
import type { MenuReportRow } from "@/types/analytics";
import { formatNumber } from "@/utils/format";
import { menuActionLabel, menuDeviceLabel, menuLevelLabel, menuTargetLabel, prepareMenuRows } from "@/components/menus/menu-presenters";

export function MenuTable({ rows }: { rows: MenuReportRow[] }) {
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState("all");
  const displayRows = useMemo(() => prepareMenuRows(rows), [rows]);
  const filtered = useMemo(() => displayRows.filter((row) => {
    const matchesQuery = `${row.menuName} ${row.parentMenuName} ${row.menuKey} ${menuActionLabel(row.menuAction)} ${menuTargetLabel(row.clickTarget)}`.toLowerCase().includes(query.toLowerCase());
    const matchesDevice = device === "all" || row.deviceCategory === device;
    return matchesQuery && matchesDevice;
  }), [device, displayRows, query]);
  const total = filtered.reduce((sum, row) => sum + row.clickCount, 0);

  return (
    <>
      <div className="table-tools">
        <label className="search-field">
          <span>筛选菜单</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入菜单名称或 key" />
        </label>
        <div className="segmented" aria-label="设备筛选">
          {["all", "desktop", "mobile", "tablet"].map((value) => (
            <button className={device === value ? "is-active" : ""} onClick={() => setDevice(value)} key={value}>
              {value === "all" ? "全部" : value}
            </button>
          ))}
        </div>
        <span className="table-total">合计 {formatNumber(total)} 次</span>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>菜单</th><th>父菜单</th><th>层级</th><th>行为</th><th>设备</th><th>触发方式</th><th className="number-cell">点击次数</th></tr></thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={`${row.menuKey}-${row.deviceCategory}-${index}`}>
                <td title={`原始菜单 key：${row.menuKey || "未提供"}`}><strong>{row.menuName}</strong><small>{row.menuKey || "未提供 key"}</small></td>
                <td>{row.parentMenuName || "—"}</td>
                <td><span className="level-tag">{menuLevelLabel(row.menuLevel)}</span></td>
                <td>{menuActionLabel(row.menuAction)}</td>
                <td>{menuDeviceLabel(row.deviceCategory)}</td>
                <td className="target-cell" title={row.clickTarget}>{menuTargetLabel(row.clickTarget)}</td>
                <td className="number-cell"><strong>{formatNumber(row.clickCount)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="table-empty">没有符合条件的数据。</div>}
      </div>
    </>
  );
}
