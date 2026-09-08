import type { DataHealthReport, DataHealthStatus } from "@/types/analytics";
import { formatDateTime, formatNumber } from "@/utils/format";

const statusCopy: Record<DataHealthStatus, { label: string; summary: string }> = {
  healthy: { label: "运行正常", summary: "数据链路按计划运行，暂未发现明显异常。" },
  attention: { label: "需要关注", summary: "数据仍可使用，但存在需要检查的波动或质量问题。" },
  critical: { label: "发现异常", summary: "数据链路存在中断或严重质量问题，请优先处理。" },
};

function shortDate(value: string) {
  return value.slice(5).replace("-", "/");
}

function statusLabel(status: DataHealthStatus) {
  return statusCopy[status].label;
}

export function HealthDashboard({ report }: { report: DataHealthReport }) {
  const currentStatus = statusCopy[report.overallStatus];
  const maxVolume = Math.max(...report.daily.map((row) => Math.max(row.analyticsTotal, row.userEvents)), 1);

  return (
    <>
      <section className={`health-overview health-${report.overallStatus}`}>
        <div className="health-primary">
          <span className="health-pulse" aria-hidden="true" />
          <div>
            <small>当前状态</small>
            <strong>{currentStatus.label}</strong>
            <p>{currentStatus.summary}</p>
          </div>
        </div>
        <dl className="health-facts">
          <div><dt>最近同步</dt><dd>{formatDateTime(report.latestSync.importedAt)}</dd></div>
          <div><dt>连续有数据</dt><dd>{report.window.availableDays} / {report.window.expectedDays} 天</dd></div>
          <div><dt>字段有效率</dt><dd>{report.quality.validRate.toFixed(1)}%</dd></div>
          <div><dt>本次检查</dt><dd>{formatDateTime(report.generatedAt)}</dd></div>
        </dl>
      </section>

      <section className="workspace-section health-check-section">
        <div className="section-heading">
          <div><span className="eyebrow">AUTOMATIC CHECKS</span><h2>自动检查结果</h2></div>
          <span className="health-scope">{report.window.startDate} — {report.window.endDate}</span>
        </div>
        <div className="health-check-list">
          {report.checks.map((check, index) => (
            <article className={`health-check-row health-${check.status}`} key={check.key}>
              <span className="health-check-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="health-state-mark" aria-hidden="true" />
              <div className="health-check-title">
                <strong>{check.name}</strong>
                <small>{check.description}</small>
              </div>
              <div className="health-check-value">
                <span>{statusLabel(check.status)}</span>
                <strong>{check.value}</strong>
              </div>
              <div className="health-check-detail">
                <p>{check.detail}</p>
                <small>{check.recommendation}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section health-daily-section">
        <div className="section-heading">
          <div><span className="eyebrow">DAILY CONTINUITY</span><h2>最近7天数据量</h2></div>
          <span className="health-scope">GA4 报表 / 实时用户事件</span>
        </div>
        <div className="health-daily-table" role="table" aria-label="最近7天数据健康明细">
          <div className="health-daily-head" role="row">
            <span>日期</span><span>数据量</span><span>GA4 报表</span><span>用户事件</span><span>状态</span>
          </div>
          {report.daily.map((row) => {
            const missing = row.analyticsTotal === 0;
            return (
              <div className="health-daily-row" role="row" key={row.date}>
                <time dateTime={row.date}>{shortDate(row.date)}</time>
                <div className="health-volume-bars" aria-hidden="true">
                  <i className="health-volume-analytics" style={{ width: `${(row.analyticsTotal / maxVolume) * 100}%` }} />
                  <i className="health-volume-users" style={{ width: `${(row.userEvents / maxVolume) * 100}%` }} />
                </div>
                <strong>{formatNumber(row.analyticsTotal)}</strong>
                <strong>{formatNumber(row.userEvents)}</strong>
                <span className={`health-day-state ${missing ? "is-missing" : "is-ready"}`}>{missing ? "缺失" : "正常"}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
