import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { getLatestAnalysis } from "@/services/database/repositories";

export const dynamic = "force-dynamic";

export default function AnalysisPage() {
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading"><div><span className="section-number">04 / INTELLIGENCE</span><h1>AI 数据分析</h1><p>以结构化数据为证据，生成结论和下一步动作。</p></div></header>
      <AnalysisWorkspace initialResult={getLatestAnalysis()} />
    </div>
  );
}
