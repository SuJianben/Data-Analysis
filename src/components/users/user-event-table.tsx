import type { UserEventRow } from "@/types/analytics";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

export function UserEventTable({ rows }: { rows: UserEventRow[] }) {
  if (!rows.length) return <div className="table-empty">这个用户暂时没有可展示的行为记录。</div>;
  return (
    <div className="table-scroll">
      <table className="data-table user-event-table">
        <thead><tr><th>时间</th><th>事件</th><th>页面</th><th>元素</th><th>去向</th><th>设备</th><th>来源身份</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.eventId}>
              <td>{formatDate(row.occurredAt)}</td>
              <td><strong>{row.eventName}</strong><small>{row.sessionId ? `会话 ${row.sessionId.slice(0, 8)}` : ""}</small></td>
              <td className="target-cell" title={row.pagePath}>{row.pagePath || "/"}</td>
              <td><strong>{row.elementLabel || row.elementKey || "—"}</strong><small>{row.pageSection || ""}</small></td>
              <td className="target-cell" title={row.destinationPath}>{row.destinationPath || "—"}</td>
              <td>{row.deviceCategory || "unknown"}</td>
              <td><strong>{row.customerIdHash ? "登录" : "匿名"}</strong><small>{row.visitorId.slice(0, 10)}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
