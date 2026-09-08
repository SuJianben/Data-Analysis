import { MenuTable } from "@/components/menus/menu-table";
import { loadMenuReportRows } from "@/services/connectors/analytics";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";

export const dynamic = "force-dynamic";

export default async function MenusPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const range = resolveDateRange(await searchParams);
  const rows = await loadMenuReportRows(range);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading"><div><span className="section-number">02 / NAVIGATION</span><h1>菜单点击分析</h1><p>按菜单、层级、行为和设备检查导航使用情况。</p></div></header>
      <section className="workspace-section table-section">
        <MenuTable rows={rows} />
      </section>
    </div>
  );
}
