import { UserTable } from "@/components/users/user-table";
import { loadUserSummaries } from "@/services/connectors/user-events";
import { dateRangeQuery, resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const range = resolveDateRange(await searchParams);
  const rangeQuery = dateRangeQuery(range);
  const rows = await loadUserSummaries(200, range);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div><span className="section-number">04 / USERS</span><h1>用户行为</h1><p>分别查看匿名访客与登录客户的页面、按钮和商品互动。</p></div>
      </header>
      <section className="workspace-section table-section">
        <div className="table-tools"><div><span className="eyebrow">USER JOURNEYS</span><h2 className="inline-section-title">用户活动摘要</h2></div><span className="table-total">共 {rows.length} 位用户</span></div>
        <UserTable rows={rows} rangeQuery={rangeQuery} />
      </section>
    </div>
  );
}
