import type { UserEventRow } from "@/types/analytics";
import { purchaseEvidence } from "@/features/users/purchase-evidence";
import { formatShanghaiDateTime } from "@/utils/date-time";

export function UserEventTable({ rows }: { rows: UserEventRow[] }) {
  if (!rows.length) return <div className="table-empty">这个用户暂时没有可展示的行为记录。</div>;
  return (
    <div className="table-scroll">
      <table className="data-table user-event-table">
        <thead><tr><th>时间</th><th>事件</th><th>页面</th><th>内容 / 购买证据</th><th>去向</th><th>设备</th><th>来源身份</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const evidence = purchaseEvidence(row, rows);
            return (
              <tr key={row.eventId}>
                <td>{formatShanghaiDateTime(row.occurredAt)}</td>
                <td><strong>{row.eventName}</strong><small>{row.sessionId ? `会话 ${row.sessionId.slice(0, 8)}` : ""}</small></td>
                <td className="target-cell" title={row.pagePath}>{row.pagePath || "/"}</td>
                <td className={evidence ? "purchase-evidence-cell" : undefined}>
                  <strong>{evidence?.primaryText || row.elementLabel || row.elementKey || "—"}</strong>
                  <small>{evidence?.secondaryText || row.pageSection || ""}</small>
                  {evidence ? <span className={`purchase-evidence-badge is-${evidence.status}`} title={evidence.explanation}>{evidence.statusLabel}</span> : null}
                </td>
                <td className="target-cell" title={row.destinationPath}>{row.destinationPath || "—"}</td>
                <td>{row.deviceCategory || "unknown"}</td>
                <td><strong>{row.customerIdHash ? "已识别" : "匿名"}</strong><small>{row.visitorId.slice(0, 10)}</small></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
