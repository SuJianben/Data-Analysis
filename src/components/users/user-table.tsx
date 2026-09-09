"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { UserSummaryRow } from "@/types/analytics";
import { formatNumber } from "@/utils/format";
import { Pagination } from "@/components/data-table/pagination";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${Number(parts.month)}/${Number(parts.day)} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function UserTable({ rows, rangeQuery }: { rows: UserSummaryRow[]; rangeQuery: string }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(() => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [currentPage, rows]);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  if (!rows.length) {
    return <div className="table-empty">暂未收到用户级行为数据。接入事件后，这里会按访客展示行为摘要。</div>;
  }

  return (
    <>
      <div className="table-scroll">
        <table className="data-table user-table">
          <thead><tr><th>用户</th><th>首次出现</th><th>最近活动</th><th>设备身份</th><th>访问页面</th><th>事件数</th><th>购买</th><th /></tr></thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.identityKey}>
                <td><strong>{row.identityType === "customer" ? "登录客户" : "匿名访客"} {row.identityId.slice(0, 10)}</strong><small>{row.identityType === "customer" ? "脱敏账号标识" : "浏览器匿名标识"}</small></td>
                <td>{formatDate(row.firstSeenAt)}</td>
                <td>{formatDate(row.lastSeenAt)}</td>
                <td>{formatNumber(row.visitorCount)}</td>
                <td>{formatNumber(row.pagesVisited)}</td>
                <td>{formatNumber(row.eventCount)}</td>
                <td>{formatNumber(row.purchaseCount)}</td>
                <td className="number-cell"><Link className="table-link" href={`/users/${encodeURIComponent(row.identityKey)}?${rangeQuery}`}>查看行为 →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} totalItems={rows.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </>
  );
}
