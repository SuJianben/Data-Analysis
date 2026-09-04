import Link from "next/link";
import { UserEventTable } from "@/components/users/user-event-table";
import { getUserEvents } from "@/services/database/repositories";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await params;
  const rows = getUserEvents(visitorId);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div><Link className="back-link" href="/users">← 返回用户列表</Link><span className="section-number">04 / USER JOURNEY</span><h1>访客 {visitorId.slice(0, 10)}</h1><p>按时间查看该访客的页面和交互轨迹。</p></div>
      </header>
      <section className="workspace-section table-section">
        <div className="table-tools"><div><span className="eyebrow">EVENT STREAM</span><h2 className="inline-section-title">行为记录</h2></div><span className="table-total">共 {rows.length} 条事件</span></div>
        <UserEventTable rows={rows} />
      </section>
    </div>
  );
}
