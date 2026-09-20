"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { UserSummaryRow } from "@/types/analytics";
import { formatNumber } from "@/utils/format";
import { Pagination } from "@/components/data-table/pagination";
import { userIdentityDescription, userIdentityTypeLabel } from "@/features/users/identity";
import { formatShanghaiMonthDayTime } from "@/utils/date-time";

const PAGE_SIZE = 20;

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
                <td><strong>{userIdentityTypeLabel(row.identityType)} {row.identityId.slice(0, 10)}</strong><small>{userIdentityDescription(row.identityType)}</small></td>
                <td>{formatShanghaiMonthDayTime(row.firstSeenAt)}</td>
                <td>{formatShanghaiMonthDayTime(row.lastSeenAt)}</td>
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
