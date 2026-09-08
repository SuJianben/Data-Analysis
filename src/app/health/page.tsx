import { HealthDashboard } from "@/components/health/health-dashboard";
import { loadDataHealthReport } from "@/services/connectors/analytics";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const report = await loadDataHealthReport();
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading">
        <div>
          <span className="section-number">05 / DATA HEALTH</span>
          <h1>数据健康监控</h1>
          <p>自动检查同步时效、数据连续性、关键字段质量和数据量异常。</p>
        </div>
      </header>
      <HealthDashboard report={report} />
    </div>
  );
}
