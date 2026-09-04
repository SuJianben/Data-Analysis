import Link from "next/link";
import type { UserSummaryRow } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

export function UserTable({ rows }: { rows: UserSummaryRow[] }) {
  if (!rows.length) {
    return <div className="table-empty">暂未收到用户级行为数据。接入事件后，这里会按访客展示行为摘要。</div>;
  }

  return (
    <div className="table-scroll">
      <table className="data-table user-table">
        <thead><tr><th>用户</th><th>首次出现</th><th>最近活动</th><th>访问页面</th><th>事件数</th><th>购买</th><th /></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.visitorId}>
              <td><strong>访客 {row.visitorId.slice(0, 10)}</strong><small>{row.customerIdHash ? "已绑定客户" : "匿名访客"}</small></td>
              <td>{formatDate(row.firstSeenAt)}</td>
              <td>{formatDate(row.lastSeenAt)}</td>
              <td>{formatNumber(row.pagesVisited)}</td>
              <td>{formatNumber(row.eventCount)}</td>
              <td>{formatNumber(row.purchaseCount)}</td>
              <td className="number-cell"><Link className="table-link" href={`/users/${encodeURIComponent(row.visitorId)}`}>查看行为 →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
