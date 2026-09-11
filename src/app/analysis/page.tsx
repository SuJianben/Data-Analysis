import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";
import { resolveSite } from "@/features/site-selection/site-selection";
import { sites } from "@/config/sites";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const params = await searchParams;
  const range = resolveDateRange(params);
  const site = resolveSite(params);
  const selectedSite = sites[site];
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading"><div><span className="section-number">06 / INTELLIGENCE · {selectedSite.shortLabel}</span><h1>AI 数据分析</h1><p>以 {selectedSite.label} 的结构化数据为证据，生成结论和下一步动作。</p></div></header>
      <AnalysisWorkspace initialResult={null} dateRange={range} site={site} />
    </div>
  );
}
