import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { resolveDateRange, type DateRangeParams } from "@/features/date-range/date-range";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const range = resolveDateRange(await searchParams);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading"><div><span className="section-number">04 / INTELLIGENCE</span><h1>AI 数据分析</h1><p>以结构化数据为证据，生成结论和下一步动作。</p></div></header>
      <AnalysisWorkspace initialResult={null} dateRange={range} />
    </div>
  );
}
