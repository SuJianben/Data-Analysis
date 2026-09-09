"use client";

import { useEffect, useMemo, useState } from "react";
import type { GlobalClickReportRow } from "@/types/analytics";
import { formatNumber } from "@/utils/format";
import { Pagination } from "@/components/data-table/pagination";

const PAGE_SIZE = 20;

const elementTypeLabels: Record<string, string> = {
  link: "链接",
  button: "按钮",
  role_button: "按钮",
  toggle: "展开/收起",
  plus: "增加数量",
  minus: "减少数量",
  next: "下一项",
  previous: "上一项",
  prev: "上一项",
};

function readablePath(path: string) {
  const segment = path.split("/").filter(Boolean).pop() || "";
  try {
    return decodeURIComponent(segment)
      .replace(/-\d{5,}$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return segment.replace(/-\d{5,}$/, "").replace(/[-_]+/g, " ").trim();
  }
}

function rawElementType(row: GlobalClickReportRow) {
  const key = row.elementKey || "";
  if (elementTypeLabels[row.clickTarget || ""]) return row.clickTarget || "";
  if (/^CardLink--/i.test(key)) return "card_link";
  if (/^Summary-|^toggle$/i.test(key)) return "toggle";
  if (/^(plus|minus|next|previous|prev)$/i.test(key)) return key.toLowerCase();
  if (/^link:/i.test(key)) return "link";
  return key;
}

function friendlyElementType(row: GlobalClickReportRow) {
  const type = rawElementType(row);
  return elementTypeLabels[type] || (type === "card_link" ? "商品卡片链接" : type || "交互控件");
}

function friendlyElementName(row: GlobalClickReportRow) {
  const label = row.elementLabel?.trim();
  if (label) return label;
  const type = rawElementType(row);
  if (type === "card_link") return "商品卡片";
  if (type === "link" && row.destinationPath) return `链接 · ${readablePath(row.destinationPath)}`;
  return elementTypeLabels[type] || "未命名控件";
}

function displayLabel(row: GlobalClickReportRow) {
  const label = row.elementLabel?.trim();
  if (label) return label;
  if (row.destinationPath?.startsWith("/products/")) return readablePath(row.destinationPath);
  return "—";
}

export function GlobalClickTable({ rows }: { rows: GlobalClickReportRow[] }) {
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = [
      row.pagePath,
      row.elementKey,
      row.elementLabel,
      row.destinationPath,
      row.pageSection,
      friendlyElementName(row),
      displayLabel(row),
    ].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (device === "all" || row.deviceCategory === device);
  }), [device, query, rows]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [currentPage, filtered]);
  const total = filtered.reduce((sum, row) => sum + row.clickCount, 0);

  useEffect(() => {
    setPage(1);
  }, [device, query, rows]);

  return (
    <>
      <div className="table-tools">
        <label className="search-field">
          <span>筛选点击</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="页面、元素或跳转路径" />
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
          <thead><tr><th>元素</th><th>所在页面</th><th>名称/标签</th><th>跳转到</th><th>区域</th><th>设备</th><th className="number-cell">点击次数</th></tr></thead>
          <tbody>
            {pageRows.map((row, index) => (
              <tr key={row.date + row.pagePath + row.elementKey + row.destinationPath + index}>
                <td title={`原始标识：${row.elementKey}`}><strong>{friendlyElementName(row)}</strong><small>{friendlyElementType(row)}</small></td>
                <td className="target-cell" title={row.pagePath}>{row.pagePath}</td>
                <td>{displayLabel(row)}</td>
                <td className="target-cell" title={row.destinationPath}>{row.destinationPath || "—"}</td>
                <td>{row.pageSection || "other"}</td>
                <td>{row.deviceCategory}</td>
                <td className="number-cell"><strong>{formatNumber(row.clickCount)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="table-empty">暂无全局点击数据。同步 GA4 后会显示真实结果。</div>}
      </div>
      <Pagination page={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </>
  );
}
