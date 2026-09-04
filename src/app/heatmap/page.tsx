import { HeatmapWorkspace } from "@/components/heatmap/heatmap-workspace";
import { getHeatmapPagePaths, getHeatmapReportRows } from "@/services/database/repositories";

export const dynamic = "force-dynamic";

export default function HeatmapPage() {
  const rows = getHeatmapReportRows();
  const paths = getHeatmapPagePaths();
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div>
          <span className="section-number">03 / BEHAVIOR</span>
          <h1>页面点击热力图</h1>
          <p>按真实 GA4 点击事件还原页面中的高频区域。</p>
        </div>
      </header>
      <HeatmapWorkspace rows={rows} paths={paths} />
    </div>
  );
}
