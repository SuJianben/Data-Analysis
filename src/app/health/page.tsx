import { HealthDashboard } from "@/components/health/health-dashboard";
import { loadDataHealthReport } from "@/services/connectors/analytics";
import { resolveSite } from "@/features/site-selection/site-selection";
import type { DateRangeParams } from "@/features/date-range/date-range";
import { sites } from "@/config/sites";

export const dynamic = "force-dynamic";

export default async function HealthPage({ searchParams }: { searchParams: Promise<DateRangeParams> }) {
  const site = resolveSite(await searchParams);
  const selectedSite = sites[site];
  const report = await loadDataHealthReport(site);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div>
          <span className="section-number">05 / DATA HEALTH · {selectedSite.shortLabel}</span>
          <h1>数据健康监控</h1>
          <p>自动检查 {selectedSite.label} 的同步时效、数据连续性、关键字段质量和数据量异常。</p>
        </div>
      </header>
      <HealthDashboard report={report} />
    </div>
  );
}
