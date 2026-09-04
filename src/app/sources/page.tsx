import { appConfig } from "@/config/env";
import { SourceManager } from "@/components/sources/source-manager";
import { SyncList } from "@/components/dashboard/sync-list";
import { getRecentSyncRuns } from "@/services/database/repositories";
import { getGa4CredentialMode } from "@/services/connectors/ga4-auth";

export const dynamic = "force-dynamic";

export default function SourcesPage() {
  const runs = getRecentSyncRuns(10);
  return (
    <div className="page page-enter">
      <header className="page-heading compact-heading"><div><span className="section-number">03 / SOURCES</span><h1>数据源与接口</h1><p>密钥只参与本机后端请求，不会写入数据库。</p></div></header>
      <SourceManager
        propertyId={appConfig.ga4PropertyId}
        ga4CredentialMode={getGa4CredentialMode()}
        clarityConfigured={Boolean(appConfig.clarityApiToken)}
      />
      <section className="workspace-section sync-section"><div className="section-heading"><div><span className="eyebrow">SYNC LOG</span><h2>同步日志</h2></div></div><SyncList runs={runs} /></section>
    </div>
  );
}
