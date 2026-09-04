import { MenuTable } from "@/components/menus/menu-table";
import { getMenuReportRows } from "@/services/database/repositories";

export const dynamic = "force-dynamic";

export default function MenusPage() {
  const rows = getMenuReportRows();
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading"><div><span className="section-number">02 / NAVIGATION</span><h1>菜单点击分析</h1><p>按菜单、层级、行为和设备检查导航使用情况。</p></div></header>
      <section className="workspace-section table-section">
        <MenuTable rows={rows} />
      </section>
    </div>
  );
}
