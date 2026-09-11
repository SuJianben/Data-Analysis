import type { Env, SiteKey } from "./types";
import type {
  DataHealthCheck,
  DataHealthDailyPoint,
  DataHealthReport,
  DataHealthStatus,
} from "./health-types";

type DailyValueRow = { date: string; value: number };
type CountRow = { total: number; invalid: number };
type LatestSyncRow = {
  importedAt: string;
  periodStart: string;
  periodEnd: string;
  rowCount: number;
};

const DAY_MS = 86_400_000;

function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateList(startDate: string, endDate: string) {
  const values: string[] = [];
  for (let date = startDate; date <= endDate; date = shiftDate(date, 1)) values.push(date);
  return values;
}

function valueMap(rows: unknown[]) {
  return new Map((rows as DailyValueRow[]).map((row) => [row.date, Number(row.value || 0)]));
}

function statusRank(status: DataHealthStatus) {
  return status === "critical" ? 2 : status === "attention" ? 1 : 0;
}

function overallStatus(checks: DataHealthCheck[]): DataHealthStatus {
  return checks.reduce<DataHealthStatus>(
    (result, check) => statusRank(check.status) > statusRank(result) ? check.status : result,
    "healthy",
  );
}

function hoursSince(value: string | null, now: Date) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (now.getTime() - timestamp) / 3_600_000);
}

function buildChecks(
  latestSync: LatestSyncRow | null,
  delayHours: number | null,
  missingDates: string[],
  quality: DataHealthReport["quality"],
  daily: DataHealthDailyPoint[],
): DataHealthCheck[] {
  const syncStatus: DataHealthStatus = delayHours === null || delayHours > 60
    ? "critical"
    : delayHours > 36 ? "attention" : "healthy";
  const continuityStatus: DataHealthStatus = missingDates.length > 1
    ? "critical"
    : missingDates.length === 1 ? "attention" : "healthy";
  const qualityStatus: DataHealthStatus = quality.validRate < 80
    ? "critical"
    : quality.validRate < 95 ? "attention" : "healthy";
  const current = daily.at(-1)?.analyticsTotal || 0;
  const baselineValues = daily.slice(0, -1).map((row) => row.analyticsTotal).filter((value) => value > 0);
  const baseline = baselineValues.length
    ? baselineValues.reduce((sum, value) => sum + value, 0) / baselineValues.length
    : 0;
  const ratio = baseline ? current / baseline : null;
  const volumeStatus: DataHealthStatus = baseline > 0 && current === 0
    ? "critical"
    : ratio !== null && (ratio < 0.5 || ratio > 2.5) ? "attention" : "healthy";

  return [
    {
      key: "sync_freshness",
      name: "同步新鲜度",
      description: "确认 GA4 报表是否按计划写入云端数据库。",
      status: syncStatus,
      value: delayHours === null ? "未同步" : `${Math.round(delayHours)} 小时前`,
      detail: latestSync
        ? `最近一次同步覆盖 ${latestSync.periodStart} 至 ${latestSync.periodEnd}，写入 ${latestSync.rowCount} 行。`
        : "尚未找到成功的 GA4 同步记录。",
      recommendation: syncStatus === "healthy" ? "保持每日同步计划。" : "检查本机自动化、Google 登录状态和同步脚本运行记录。",
    },
    {
      key: "data_continuity",
      name: "数据连续性",
      description: "检查最近7个完整自然日是否每天都有 GA4 数据。",
      status: continuityStatus,
      value: missingDates.length ? `缺少 ${missingDates.length} 天` : "连续 7 天",
      detail: missingDates.length ? `缺失日期：${missingDates.join("、")}` : "最近7天均存在菜单、全局点击或站点事件数据。",
      recommendation: continuityStatus === "healthy" ? "无需处理。" : "重新同步缺失日期，并确认 GA4 当日确实产生事件。",
    },
    {
      key: "field_quality",
      name: "关键字段质量",
      description: "检查菜单名称、元素名称和用户事件标识是否可读。",
      status: qualityStatus,
      value: `${quality.validRate.toFixed(1)}% 有效`,
      detail: `检查 ${quality.observedCount} 条事件量，其中 ${quality.invalidCount} 条缺少有效名称或使用通用名称。`,
      recommendation: qualityStatus === "healthy" ? "字段命名质量正常。" : "优先完善名称为空、not set、button、toggle 等元素的埋点语义。",
    },
    {
      key: "volume_change",
      name: "数据量波动",
      description: "将最近完整日与此前有数据日期的平均值比较。",
      status: volumeStatus,
      value: ratio === null ? "等待基线" : `${ratio >= 1 ? "+" : ""}${Math.round((ratio - 1) * 100)}%`,
      detail: ratio === null
        ? "历史有效日期不足，暂时不能判断数据量变化。"
        : `最近完整日 ${current} 次，历史日均 ${Math.round(baseline)} 次。`,
      recommendation: volumeStatus === "healthy" ? "当前波动在正常阈值内。" : "结合流量变化检查埋点是否断流或重复触发。",
    },
  ];
}

export async function getDataHealthReport(env: Env, site: SiteKey = "tkf", now = new Date()): Promise<DataHealthReport> {
  const endDate = shiftDate(shanghaiDate(now), -1);
  const startDate = shiftDate(endDate, -6);
  const [latestSyncResult, menuResult, globalResult, siteResult, userResult, menuQualityResult, globalQualityResult, userQualityResult] = await env.DB.batch([
    env.DB.prepare(`
      SELECT imported_at AS importedAt, period_start AS periodStart, period_end AS periodEnd, row_count AS rowCount
      FROM analytics_sync_runs WHERE site_key = ? AND status = 'success' ORDER BY imported_at DESC LIMIT 1
    `).bind(site),
    env.DB.prepare("SELECT event_date AS date, SUM(click_count) AS value FROM menu_click_metrics WHERE site_key = ? AND event_date BETWEEN ? AND ? GROUP BY event_date").bind(site, startDate, endDate),
    env.DB.prepare("SELECT event_date AS date, SUM(click_count) AS value FROM global_click_metrics WHERE site_key = ? AND event_date BETWEEN ? AND ? GROUP BY event_date").bind(site, startDate, endDate),
    env.DB.prepare("SELECT event_date AS date, SUM(event_count) AS value FROM site_metrics WHERE site_key = ? AND event_date BETWEEN ? AND ? GROUP BY event_date").bind(site, startDate, endDate),
    env.DB.prepare("SELECT SUBSTR(occurred_at, 1, 10) AS date, COUNT(*) AS value FROM user_events WHERE site_key = ? AND occurred_at >= ? AND occurred_at < ? GROUP BY SUBSTR(occurred_at, 1, 10)").bind(site, `${startDate}T00:00:00.000Z`, `${shiftDate(endDate, 1)}T00:00:00.000Z`),
    env.DB.prepare(`
      SELECT COALESCE(SUM(click_count), 0) AS total,
        COALESCE(SUM(CASE WHEN TRIM(menu_name) = '' OR LOWER(TRIM(menu_name)) IN ('(not set)', 'not set', '(未命名菜单)', '未命名菜单') THEN click_count ELSE 0 END), 0) AS invalid
      FROM menu_click_metrics WHERE site_key = ? AND event_date BETWEEN ? AND ?
    `).bind(site, startDate, endDate),
    env.DB.prepare(`
      SELECT COALESCE(SUM(click_count), 0) AS total,
        COALESCE(SUM(CASE WHEN TRIM(element_key) = '' OR TRIM(element_label) = '' OR LOWER(TRIM(element_label)) IN ('button', 'toggle', 'link', 'minus', 'next') THEN click_count ELSE 0 END), 0) AS invalid
      FROM global_click_metrics WHERE site_key = ? AND event_date BETWEEN ? AND ?
    `).bind(site, startDate, endDate),
    env.DB.prepare(`
      SELECT COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN TRIM(visitor_id) = '' OR TRIM(event_name) = '' OR TRIM(page_path) = '' THEN 1 ELSE 0 END), 0) AS invalid
      FROM user_events WHERE site_key = ? AND occurred_at >= ? AND occurred_at < ?
    `).bind(site, `${startDate}T00:00:00.000Z`, `${shiftDate(endDate, 1)}T00:00:00.000Z`),
  ]);

  const menu = valueMap(menuResult.results);
  const global = valueMap(globalResult.results);
  const siteMetrics = valueMap(siteResult.results);
  const users = valueMap(userResult.results);
  const daily = dateList(startDate, endDate).map<DataHealthDailyPoint>((date) => {
    const menuClicks = menu.get(date) || 0;
    const globalClicks = global.get(date) || 0;
    const siteEvents = siteMetrics.get(date) || 0;
    return {
      date,
      menuClicks,
      globalClicks,
      siteEvents,
      userEvents: users.get(date) || 0,
      analyticsTotal: menuClicks + globalClicks + siteEvents,
    };
  });
  const missingDates = daily.filter((row) => row.analyticsTotal === 0).map((row) => row.date);
  const qualityRows = [menuQualityResult.results[0], globalQualityResult.results[0], userQualityResult.results[0]] as CountRow[];
  const observedCount = qualityRows.reduce((sum, row) => sum + Number(row?.total || 0), 0);
  const invalidCount = qualityRows.reduce((sum, row) => sum + Number(row?.invalid || 0), 0);
  const quality = {
    observedCount,
    invalidCount,
    validRate: observedCount ? ((observedCount - invalidCount) / observedCount) * 100 : 100,
  };
  const latestSync = (latestSyncResult.results[0] as LatestSyncRow | undefined) || null;
  const delayHours = hoursSince(latestSync?.importedAt || null, now);
  const checks = buildChecks(latestSync, delayHours, missingDates, quality, daily);

  return {
    overallStatus: overallStatus(checks),
    generatedAt: now.toISOString(),
    window: {
      startDate,
      endDate,
      availableDays: daily.length - missingDates.length,
      expectedDays: daily.length,
      missingDates,
    },
    latestSync: {
      importedAt: latestSync?.importedAt || null,
      periodStart: latestSync?.periodStart || null,
      periodEnd: latestSync?.periodEnd || null,
      rowCount: Number(latestSync?.rowCount || 0),
      delayHours,
    },
    quality,
    daily,
    checks,
  };
}
