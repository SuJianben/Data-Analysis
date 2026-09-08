import { db } from "@/services/database/db";
import { saveUserEvents } from "@/services/database/user-event-repository";
import type {
  AnalysisResult,
  DashboardSummary,
  DateRangeOptions,
  DataImportPayload,
  MenuMetricInput,
  MenuReportRow,
  HeatmapMetricInput,
  HeatmapReportRow,
  GlobalClickMetricInput,
  GlobalClickReportRow,
  SiteMetricInput,
  SyncRun,
  TrendPoint,
} from "@/types/analytics";

type CountRow = { value: number };
type NullableValueRow = { value: number | null };

const isoNow = () => new Date().toISOString();

function dateFilter(options: DateRangeOptions, extra: string[] = []) {
  const conditions = [...extra];
  const values: string[] = [];
  if (options.startDate) { conditions.push("event_date >= ?"); values.push(options.startDate); }
  if (options.endDate) { conditions.push("event_date <= ?"); values.push(options.endDate); }
  return { clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values };
}

export function startSync(source: string) {
  const result = db
    .prepare("INSERT INTO sync_runs (source, status, started_at) VALUES (?, 'running', ?)")
    .run(source, isoNow());
  return Number(result.lastInsertRowid);
}

export function finishSync(id: number, status: "success" | "failed", rowCount: number, message: string) {
  db.prepare(
    "UPDATE sync_runs SET status = ?, finished_at = ?, row_count = ?, message = ? WHERE id = ?",
  ).run(status, isoNow(), rowCount, message, id);
}

export function saveMenuMetrics(source: string, rows: MenuMetricInput[]) {
  const statement = db.prepare(`
    INSERT INTO menu_click_metrics (
      source, event_date, device_category, menu_name, menu_key, parent_menu_name,
      menu_level, menu_action, navigation_location, click_target, click_count, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, event_date, device_category, menu_key, menu_name, parent_menu_name, menu_action, click_target)
    DO UPDATE SET
      menu_level = excluded.menu_level,
      navigation_location = excluded.navigation_location,
      click_count = excluded.click_count,
      imported_at = excluded.imported_at
  `);
  const importedAt = isoNow();
  for (const row of rows) {
    statement.run(
      source,
      row.date,
      row.deviceCategory || "unknown",
      row.menuName,
      row.menuKey || "",
      row.parentMenuName || "",
      row.menuLevel || "",
      row.menuAction || "",
      row.navigationLocation || "header",
      row.clickTarget || "",
      row.clickCount,
      importedAt,
    );
  }
}

export function saveSiteMetrics(source: string, rows: SiteMetricInput[]) {
  const statement = db.prepare(`
    INSERT INTO site_metrics (
      source, event_date, device_category, event_name, event_count, total_users, total_revenue, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, event_date, device_category, event_name)
    DO UPDATE SET
      event_count = excluded.event_count,
      total_users = excluded.total_users,
      total_revenue = excluded.total_revenue,
      imported_at = excluded.imported_at
  `);
  const importedAt = isoNow();
  for (const row of rows) {
    statement.run(
      source,
      row.date,
      row.deviceCategory || "unknown",
      row.eventName,
      row.eventCount,
      row.totalUsers || 0,
      row.totalRevenue || 0,
      importedAt,
    );
  }
}

export function saveHeatmapMetrics(source: string, rows: HeatmapMetricInput[]) {
  const statement = db.prepare(`
    INSERT INTO heatmap_click_metrics (
      source, event_date, device_category, page_path, heatmap_cell, element_group,
      page_section, click_target, scroll_bucket, click_count, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, event_date, device_category, page_path, heatmap_cell, element_group, page_section, click_target, scroll_bucket)
    DO UPDATE SET click_count = excluded.click_count, imported_at = excluded.imported_at
  `);
  const importedAt = isoNow();
  for (const row of rows) {
    statement.run(
      source,
      row.date,
      row.deviceCategory || "unknown",
      row.pagePath || "/",
      row.heatmapCell,
      row.elementGroup || "other",
      row.pageSection || "other",
      row.clickTarget || "",
      row.scrollBucket || "0",
      row.clickCount,
      importedAt,
    );
  }
}

export function saveGlobalClickMetrics(source: string, rows: GlobalClickMetricInput[]) {
  const statement = db.prepare(`
    INSERT INTO global_click_metrics (
      source, event_date, device_category, page_path, element_key, element_label,
      page_section, destination_path, click_target, click_count, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, event_date, device_category, page_path, element_key, element_label, page_section, destination_path, click_target)
    DO UPDATE SET click_count = excluded.click_count, imported_at = excluded.imported_at
  `);
  const importedAt = isoNow();
  for (const row of rows) {
    statement.run(
      source,
      row.date,
      row.deviceCategory || "unknown",
      row.pagePath || "/",
      row.elementKey,
      row.elementLabel || "",
      row.pageSection || "other",
      row.destinationPath || "",
      row.clickTarget || "other",
      row.clickCount,
      importedAt,
    );
  }
}

export function saveSnapshot(payload: DataImportPayload | Record<string, unknown>, periodStart: string, periodEnd: string, source: string) {
  db.prepare(
    "INSERT INTO data_snapshots (source, period_start, period_end, payload_json, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(source, periodStart, periodEnd, JSON.stringify(payload), isoNow());
}

export function importDataset(payload: DataImportPayload) {
  const syncId = startSync(payload.source);
  try {
    saveMenuMetrics(payload.source, payload.menuMetrics || []);
    saveSiteMetrics(payload.source, payload.siteMetrics || []);
    saveHeatmapMetrics(payload.source, payload.heatmapMetrics || []);
    saveGlobalClickMetrics(payload.source, payload.globalClickMetrics || []);
    saveUserEvents(payload.source, payload.userEvents || []);
    saveSnapshot(payload, payload.period.start, payload.period.end, payload.source);
    const rowCount = (payload.menuMetrics?.length || 0) + (payload.siteMetrics?.length || 0) + (payload.heatmapMetrics?.length || 0) + (payload.globalClickMetrics?.length || 0) + (payload.userEvents?.length || 0);
    finishSync(syncId, "success", rowCount, "数据已导入");
    return { syncId, rowCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    finishSync(syncId, "failed", 0, message);
    throw error;
  }
}

export function getDashboardSummary(options: DateRangeOptions = {}): DashboardSummary {
  const menuFilter = dateFilter(options);
  const namedMenuFilter = dateFilter(options, ["menu_name <> ''"]);
  const pageViewFilter = dateFilter(options, ["event_name = 'page_view'"]);
  const purchaseFilter = dateFilter(options, ["event_name = 'purchase'"]);
  const clicks = db.prepare(`SELECT COALESCE(SUM(click_count), 0) AS value FROM menu_click_metrics ${menuFilter.clause}`).get(...menuFilter.values) as CountRow;
  const menus = db.prepare(`SELECT COUNT(DISTINCT menu_name) AS value FROM menu_click_metrics ${namedMenuFilter.clause}`).get(...namedMenuFilter.values) as CountRow;
  const users = db.prepare(`SELECT COALESCE(SUM(total_users), 0) AS value FROM site_metrics ${pageViewFilter.clause}`).get(...pageViewFilter.values) as CountRow;
  const purchases = db.prepare(`SELECT COALESCE(SUM(event_count), 0) AS value FROM site_metrics ${purchaseFilter.clause}`).get(...purchaseFilter.values) as CountRow;
  const revenue = db.prepare(`SELECT COALESCE(SUM(total_revenue), 0) AS value FROM site_metrics ${purchaseFilter.clause}`).get(...purchaseFilter.values) as CountRow;
  const latest = db.prepare("SELECT MAX(finished_at) AS value FROM sync_runs WHERE status = 'success'").get() as { value: string | null };
  const dates = db.prepare(`SELECT DISTINCT event_date AS value FROM menu_click_metrics ${menuFilter.clause} ORDER BY event_date DESC LIMIT 2`).all(...menuFilter.values) as { value: string }[];
  let clickChange: number | null = null;
  if (dates.length === 2) {
    const current = db.prepare("SELECT COALESCE(SUM(click_count), 0) AS value FROM menu_click_metrics WHERE event_date = ?").get(dates[0].value) as CountRow;
    const previous = db.prepare("SELECT COALESCE(SUM(click_count), 0) AS value FROM menu_click_metrics WHERE event_date = ?").get(dates[1].value) as CountRow;
    clickChange = previous.value ? ((current.value - previous.value) / previous.value) * 100 : null;
  }
  return {
    clicks: clicks.value,
    menus: menus.value,
    users: users.value,
    purchases: purchases.value,
    revenue: revenue.value,
    clickChange,
    latestSync: latest.value,
  };
}

export function getClickTrend(options: DateRangeOptions = {}): TrendPoint[] {
  const filter = dateFilter(options);
  return db.prepare(`
    SELECT date, clicks FROM (
      SELECT event_date AS date, SUM(click_count) AS clicks
      FROM menu_click_metrics ${filter.clause}
      GROUP BY event_date ORDER BY event_date DESC
    ) ORDER BY date ASC
  `).all(...filter.values) as TrendPoint[];
}

export function getMenuReportRows(options: DateRangeOptions = {}): MenuReportRow[] {
  const filter = dateFilter(options);
  return db.prepare(`
    SELECT
      menu_name AS menuName,
      menu_key AS menuKey,
      parent_menu_name AS parentMenuName,
      menu_level AS menuLevel,
      menu_action AS menuAction,
      navigation_location AS navigationLocation,
      click_target AS clickTarget,
      device_category AS deviceCategory,
      SUM(click_count) AS clickCount
    FROM menu_click_metrics ${filter.clause}
    GROUP BY menu_name, menu_key, parent_menu_name, menu_level, menu_action, navigation_location, click_target, device_category
    ORDER BY clickCount DESC, menuName ASC
  `).all(...filter.values) as MenuReportRow[];
}

export function getSiteMetricReportRows(options: DateRangeOptions = {}): SiteMetricInput[] {
  const filter = dateFilter(options);
  return db.prepare(`
    SELECT
      event_date AS date,
      device_category AS deviceCategory,
      event_name AS eventName,
      SUM(event_count) AS eventCount,
      SUM(total_users) AS totalUsers,
      SUM(total_revenue) AS totalRevenue
    FROM site_metrics ${filter.clause}
    GROUP BY event_date, device_category, event_name
    ORDER BY event_date ASC, event_name ASC
  `).all(...filter.values) as SiteMetricInput[];
}

export function getHeatmapReportRows(options: { pagePath?: string; startDate?: string; endDate?: string } = {}): HeatmapReportRow[] {
  const where: string[] = [];
  const values: string[] = [];
  if (options.pagePath) { where.push("page_path = ?"); values.push(options.pagePath); }
  if (options.startDate) { where.push("event_date >= ?"); values.push(options.startDate); }
  if (options.endDate) { where.push("event_date <= ?"); values.push(options.endDate); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db.prepare(`
    SELECT
      event_date AS date,
      device_category AS deviceCategory,
      page_path AS pagePath,
      heatmap_cell AS heatmapCell,
      element_group AS elementGroup,
      page_section AS pageSection,
      click_target AS clickTarget,
      scroll_bucket AS scrollBucket,
      SUM(click_count) AS clickCount
    FROM heatmap_click_metrics
    ${clause}
    GROUP BY event_date, device_category, page_path, heatmap_cell, element_group, page_section, click_target, scroll_bucket
    ORDER BY clickCount DESC, event_date ASC
  `).all(...values) as HeatmapReportRow[];
}

export function getHeatmapPagePaths(): string[] {
  return (db.prepare("SELECT page_path AS value FROM heatmap_click_metrics GROUP BY page_path ORDER BY SUM(click_count) DESC, page_path ASC").all() as { value: string }[]).map((row) => row.value);
}

export function getGlobalClickReportRows(options: { pagePath?: string; startDate?: string; endDate?: string } = {}): GlobalClickReportRow[] {
  const where: string[] = [];
  const values: string[] = [];
  if (options.pagePath) { where.push("page_path = ?"); values.push(options.pagePath); }
  if (options.startDate) { where.push("event_date >= ?"); values.push(options.startDate); }
  if (options.endDate) { where.push("event_date <= ?"); values.push(options.endDate); }
  const clause = where.length ? "WHERE " + where.join(" AND ") : "";
  const query = [
    "SELECT event_date AS date, device_category AS deviceCategory, page_path AS pagePath,",
    "element_key AS elementKey, element_label AS elementLabel, page_section AS pageSection,",
    "destination_path AS destinationPath, click_target AS clickTarget, SUM(click_count) AS clickCount",
    "FROM global_click_metrics",
    clause,
    "GROUP BY event_date, device_category, page_path, element_key, element_label, page_section, destination_path, click_target",
    "ORDER BY clickCount DESC, event_date ASC",
  ].join(" ");
  return db.prepare(query).all(...values) as GlobalClickReportRow[];
}

export function getGlobalClickPagePaths(): string[] {
  return (db.prepare("SELECT page_path AS value FROM global_click_metrics GROUP BY page_path ORDER BY SUM(click_count) DESC, page_path ASC").all() as { value: string }[]).map((row) => row.value);
}

export function getLatestSnapshot(source: string): unknown | null {
  const row = db.prepare(
    "SELECT payload_json AS value FROM data_snapshots WHERE source = ? ORDER BY id DESC LIMIT 1",
  ).get(source) as { value: string } | undefined;
  return row ? JSON.parse(row.value) : null;
}

export function getTopMenus(limit = 6, options: DateRangeOptions = {}): MenuReportRow[] {
  const filter = dateFilter(options, ["menu_name <> ''"]);
  return db.prepare(`
    SELECT
      menu_name AS menuName,
      menu_key AS menuKey,
      parent_menu_name AS parentMenuName,
      menu_level AS menuLevel,
      menu_action AS menuAction,
      navigation_location AS navigationLocation,
      click_target AS clickTarget,
      'all' AS deviceCategory,
      SUM(click_count) AS clickCount
    FROM menu_click_metrics
    ${filter.clause}
    GROUP BY menu_name, menu_key, parent_menu_name, menu_level, menu_action, navigation_location, click_target
    ORDER BY clickCount DESC
    LIMIT ?
  `).all(...filter.values, limit) as MenuReportRow[];
}

export function getRecentSyncRuns(limit = 6): SyncRun[] {
  return db.prepare(`
    SELECT
      id,
      source,
      status,
      started_at AS startedAt,
      finished_at AS finishedAt,
      row_count AS rowCount,
      message
    FROM sync_runs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as SyncRun[];
}

export function saveAnalysis(result: AnalysisResult, periodStart: string, periodEnd: string) {
  db.prepare(
    "INSERT INTO analyses (mode, period_start, period_end, result_json, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(result.mode, periodStart, periodEnd, JSON.stringify(result), isoNow());
}

export function getLatestAnalysis(): AnalysisResult | null {
  const row = db.prepare("SELECT result_json AS value FROM analyses ORDER BY id DESC LIMIT 1").get() as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as AnalysisResult) : null;
}

export function getDatabaseStats() {
  const menuRows = db.prepare("SELECT COUNT(*) AS value FROM menu_click_metrics").get() as CountRow;
  const metricRows = db.prepare("SELECT COUNT(*) AS value FROM site_metrics").get() as CountRow;
  const snapshots = db.prepare("SELECT COUNT(*) AS value FROM data_snapshots").get() as CountRow;
  const lastAnalysis = db.prepare("SELECT MAX(created_at) AS value FROM analyses").get() as { value: string | null };
  const userEvents = db.prepare("SELECT COUNT(*) AS value FROM user_events").get() as CountRow;
  return {
    menuRows: menuRows.value,
    metricRows: metricRows.value,
    snapshots: snapshots.value,
    lastAnalysis: lastAnalysis.value,
    userEvents: userEvents.value,
  };
}
