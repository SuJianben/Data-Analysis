import type { SyncRun } from "@/types/analytics";
import { formatDateTime } from "@/utils/format";

export function SyncList({ runs }: { runs: SyncRun[] }) {
  if (!runs.length) return <p className="muted-copy">还没有同步记录。</p>;
  return (
    <div className="sync-list">
      {runs.map((run) => (
        <div className="sync-row" key={run.id}>
          <span className={`sync-state state-${run.status}`} />
          <div><strong>{run.source.toUpperCase()}</strong><small>{run.message || "同步处理中"}</small></div>
          <span>{run.rowCount} 行</span>
          <time>{formatDateTime(run.finishedAt || run.startedAt)}</time>
        </div>
      ))}
    </div>
  );
}
