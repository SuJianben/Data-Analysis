import { DistributionScatterPanel } from "@/components/data-chart/distribution-scatter";
import type { UserSummaryRow } from "@/types/analytics";

export function UserDistributionScatter({ rows }: { rows: UserSummaryRow[] }) {
  return <DistributionScatterPanel title="用户分布散点" description="按用户事件活跃度与访问页面覆盖范围查看用户分布。" xLabel="用户事件数（活跃度）" yLabel="访问页面数（覆盖范围）" quadrantLabels={{ "high-high": "高活跃·高覆盖", "low-high": "低活跃·高覆盖", "high-low": "高活跃·低覆盖", "low-low": "低活跃·低覆盖" }} pointUnit="一位用户" points={rows.map((row) => ({
    id: row.identityKey,
    label: `${row.identityType === "customer" ? "登录客户" : "匿名访客"} ${row.identityId.slice(0, 8)}`,
    x: Number(row.eventCount || 0),
    y: Number(row.pagesVisited || 0),
    category: row.identityType,
    details: [`购买次数：${Number(row.purchaseCount || 0)}`],
  }))} />;
}
