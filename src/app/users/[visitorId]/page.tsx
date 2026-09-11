import Link from "next/link";
import { UserEventTable } from "@/components/users/user-event-table";
import { parseUserIdentityKey, userIdentityLabel } from "@/features/users/identity";
import { loadUserEvents } from "@/services/connectors/user-events";
import { notFound } from "next/navigation";
import { dateRangeQuery, resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ visitorId: string }>;
  searchParams: Promise<DateRangeParams>;
}) {
  const { visitorId } = await params;
  const range = resolveDateRange(await searchParams);
  const rangeQuery = dateRangeQuery(range);
  const identity = parseUserIdentityKey(visitorId);
  if (!identity) notFound();
  const rows = await loadUserEvents(identity.key, 500, range);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div><Link className="back-link" href={`/users?${rangeQuery}`}>← 返回用户列表</Link><span className="section-number">04 / USER JOURNEY</span><h1>{userIdentityLabel(identity.type, identity.id)}</h1><p>按时间查看该用户的页面和交互轨迹。</p></div>
      </header>
      <section className="workspace-section table-section">
        <div className="table-tools"><div><span className="eyebrow">EVENT STREAM</span><h2 className="inline-section-title">行为记录</h2></div><span className="table-total">共 {rows.length} 条事件</span></div>
        <UserEventTable rows={rows} />
      </section>
    </div>
  );
}
