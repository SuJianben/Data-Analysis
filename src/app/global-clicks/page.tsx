import { GlobalClickTable } from "@/components/global-clicks/global-click-table";
import { loadGlobalClickReport } from "@/services/connectors/analytics";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";

export const dynamic = "force-dynamic";

export default async function GlobalClicksPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const range = resolveDateRange(await searchParams);
  const { rows } = await loadGlobalClickReport(range);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div>
          <span className="section-number">03 / INTERACTIONS</span>
          <h1>全局点击埋点</h1>
          <p>统一查看链接、按钮和交互控件的真实点击数据。</p>
        </div>
      </header>
      <section className="workspace-section table-section">
        <GlobalClickTable rows={rows} />
      </section>
    </div>
  );
}
