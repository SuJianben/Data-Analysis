import { UserTable } from "@/components/users/user-table";
import { getUserSummaries } from "@/services/database/repositories";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  const rows = getUserSummaries();
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div><span className="section-number">04 / USERS</span><h1>用户行为</h1><p>按匿名访客查看每一次页面、按钮和商品互动。</p></div>
      </header>
      <section className="workspace-section table-section">
        <div className="table-tools"><div><span className="eyebrow">VISITOR JOURNEYS</span><h2 className="inline-section-title">用户活动摘要</h2></div><span className="table-total">共 {rows.length} 位用户</span></div>
        <UserTable rows={rows} />
      </section>
    </div>
  );
}
