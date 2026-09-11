import type { AnalyticsImportPayload, ConversionFunnelPoint, DashboardSummary, DeviceBreakdownPoint } from "./analytics-types";
import type { DateRangeOptions } from "./date-range";
import type { Env } from "./types";

type QueryResult<T> = D1Result<T>;
type ValueRow = { value: number | string | null };

function firstValue(result: QueryResult<ValueRow>) {
  return result.results[0]?.value ?? null;
}

function dateFilter(column: string, options: DateRangeOptions, extra: string[] = []) {
  const conditions = [...extra];
  const values: string[] = [];
  if (options.startDate) { conditions.push(`${column} >= ?`); values.push(options.startDate); }
  if (options.endDate) { conditions.push(`${column} <= ?`); values.push(options.endDate); }
  return { clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values };
}

export async function importAnalyticsDataset(env: Env, payload: AnalyticsImportPayload) {
  const importedAt = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare("DELETE FROM menu_click_metrics WHERE source = ? AND event_date BETWEEN ? AND ?").bind(payload.source, payload.period.start, payload.period.end),
    env.DB.prepare("DELETE FROM site_metrics WHERE source = ? AND event_date BETWEEN ? AND ?").bind(payload.source, payload.period.start, payload.period.end),
    env.DB.prepare("DELETE FROM global_click_metrics WHERE source = ? AND event_date BETWEEN ? AND ?").bind(payload.source, payload.period.start, payload.period.end),
  ];

  for (const row of payload.menuMetrics) {
    statements.push(env.DB.prepare(`
      INSERT INTO menu_click_metrics (
        source, event_date, device_category, menu_name, menu_key, parent_menu_name,
        menu_level, menu_action, navigation_location, click_target, click_count, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payload.source, row.date, row.deviceCategory || "unknown", row.menuName, row.menuKey || "",
      row.parentMenuName || "", row.menuLevel || "", row.menuAction || "",
      row.navigationLocation || "header", row.clickTarget || "", row.clickCount, importedAt,
    ));
  }

  for (const row of payload.siteMetrics) {
    statements.push(env.DB.prepare(`
      INSERT INTO site_metrics (
        source, event_date, device_category, event_name, event_count, total_users, total_revenue, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payload.source, row.date, row.deviceCategory || "unknown", row.eventName, row.eventCount,
      row.totalUsers || 0, row.totalRevenue || 0, importedAt,
    ));
  }

  for (const row of payload.globalClickMetrics) {
    statements.push(env.DB.prepare(`
      INSERT INTO global_click_metrics (
        source, event_date, device_category, page_path, element_key, element_label,
        page_section, destination_path, click_target, click_count, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payload.source, row.date, row.deviceCategory || "unknown", row.pagePath || "/", row.elementKey,
      row.elementLabel || "", row.pageSection || "other", row.destinationPath || "",
      row.clickTarget || "other", row.clickCount, importedAt,
    ));
  }

  const rowCount = payload.menuMetrics.length + payload.siteMetrics.length + payload.globalClickMetrics.length;
  statements.push(env.DB.prepare(`
    INSERT INTO analytics_sync_runs (
      source, period_start, period_end, status, row_count, message, imported_at
    ) VALUES (?, ?, ?, 'success', ?, ?, ?)
    ON CONFLICT(source, period_start, period_end) DO UPDATE SET
      status = excluded.status,
      row_count = excluded.row_count,
      message = excluded.message,
      imported_at = excluded.imported_at
  `).bind(payload.source, payload.period.start, payload.period.end, rowCount, "数据已同步到 Cloudflare D1", importedAt));

  await env.DB.batch(statements);
  const sync = await env.DB.prepare(
    "SELECT id FROM analytics_sync_runs WHERE source = ? AND period_start = ? AND period_end = ?",
  ).bind(payload.source, payload.period.start, payload.period.end).first<{ id: number }>();
  return { syncId: sync?.id ?? null, rowCount, importedAt };
}

export async function getAnalyticsOverview(env: Env, options: DateRangeOptions = {}) {
  const menuFilter = dateFilter("event_date", options);
  const namedMenuFilter = dateFilter("event_date", options, ["menu_name <> ''"]);
  const siteFilter = dateFilter("event_date", options);
  const purchaseFilter = dateFilter("event_date", options, ["event_name = 'purchase'"]);
  const pageViewFilter = dateFilter("event_date", options, ["event_name = 'page_view'"]);
  const syncConditions: string[] = ["status = 'success'"];
  const syncValues: string[] = [];
  if (options.startDate) { syncConditions.push("period_end >= ?"); syncValues.push(options.startDate); }
  if (options.endDate) { syncConditions.push("period_start <= ?"); syncValues.push(options.endDate); }
  const syncClause = `WHERE ${syncConditions.join(" AND ")}`;
  const globalFilter = dateFilter("event_date", options, ["page_path <> ''"]);
  const [clicks, menus, users, purchases, revenue, latest, daily, topMenus, recentRuns, traffic, funnel, devices, topPages] = await env.DB.batch([
    env.DB.prepare(`SELECT COALESCE(SUM(click_count), 0) AS value FROM menu_click_metrics ${menuFilter.clause}`).bind(...menuFilter.values),
    env.DB.prepare(`SELECT COUNT(DISTINCT menu_name) AS value FROM menu_click_metrics ${namedMenuFilter.clause}`).bind(...namedMenuFilter.values),
    env.DB.prepare(`SELECT COALESCE(SUM(total_users), 0) AS value FROM site_metrics ${pageViewFilter.clause}`).bind(...pageViewFilter.values),
    env.DB.prepare(`SELECT COALESCE(SUM(event_count), 0) AS value FROM site_metrics ${purchaseFilter.clause}`).bind(...purchaseFilter.values),
    env.DB.prepare(`SELECT COALESCE(SUM(total_revenue), 0) AS value FROM site_metrics ${purchaseFilter.clause}`).bind(...purchaseFilter.values),
    env.DB.prepare(`SELECT MAX(imported_at) AS value FROM analytics_sync_runs ${syncClause}`).bind(...syncValues),
    env.DB.prepare(`
      SELECT date, clicks FROM (
        SELECT event_date AS date, SUM(click_count) AS clicks
        FROM menu_click_metrics ${menuFilter.clause} GROUP BY event_date ORDER BY event_date DESC
      ) ORDER BY date ASC
    `).bind(...menuFilter.values),
    env.DB.prepare(`
      SELECT menu_name AS menuName, menu_key AS menuKey, parent_menu_name AS parentMenuName,
        menu_level AS menuLevel, menu_action AS menuAction, navigation_location AS navigationLocation,
        click_target AS clickTarget, 'all' AS deviceCategory, SUM(click_count) AS clickCount
      FROM menu_click_metrics ${namedMenuFilter.clause}
      GROUP BY menu_name, menu_key, parent_menu_name, menu_level, menu_action, navigation_location, click_target
      ORDER BY clickCount DESC LIMIT 6
    `).bind(...namedMenuFilter.values),
    env.DB.prepare(`
      SELECT id, source, status, imported_at AS startedAt, imported_at AS finishedAt,
        row_count AS rowCount, message
      FROM analytics_sync_runs ${syncClause} ORDER BY imported_at DESC LIMIT 6
    `).bind(...syncValues),
    env.DB.prepare(`
      SELECT event_date AS date,
        SUM(CASE WHEN event_name = 'page_view' THEN event_count ELSE 0 END) AS pageViews,
        SUM(CASE WHEN event_name = 'page_view' THEN total_users ELSE 0 END) AS users,
        SUM(CASE WHEN event_name = 'session_start' THEN event_count ELSE 0 END) AS sessions
      FROM site_metrics ${siteFilter.clause}
      GROUP BY event_date ORDER BY event_date ASC
    `).bind(...siteFilter.values),
    env.DB.prepare(`
      SELECT event_name AS key, SUM(event_count) AS count
      FROM site_metrics ${siteFilter.clause ? `${siteFilter.clause} AND` : "WHERE"}
        event_name IN ('page_view', 'add_to_cart', 'begin_checkout', 'purchase')
      GROUP BY event_name
    `).bind(...siteFilter.values),
    env.DB.prepare(`
      SELECT device_category AS deviceCategory,
        SUM(CASE WHEN event_name = 'page_view' THEN event_count ELSE 0 END) AS pageViews,
        SUM(CASE WHEN event_name = 'page_view' THEN total_users ELSE 0 END) AS users,
        SUM(CASE WHEN event_name = 'purchase' THEN event_count ELSE 0 END) AS purchases,
        SUM(CASE WHEN event_name = 'purchase' THEN total_revenue ELSE 0 END) AS revenue
      FROM site_metrics ${siteFilter.clause}
      GROUP BY device_category ORDER BY users DESC, pageViews DESC
    `).bind(...siteFilter.values),
    env.DB.prepare(`
      SELECT page_path AS pagePath, SUM(click_count) AS clicks
      FROM global_click_metrics ${globalFilter.clause}
      GROUP BY page_path ORDER BY clicks DESC, pagePath ASC LIMIT 6
    `).bind(...globalFilter.values),
  ]);

  const trend = daily.results as Array<{ date: string; clicks: number }>;
  const latestTwo = trend.slice(-2);
  const current = Number(latestTwo.at(-1)?.clicks || 0);
  const previous = Number(latestTwo.at(-2)?.clicks || 0);
  const summary: DashboardSummary = {
    clicks: Number(firstValue(clicks as QueryResult<ValueRow>) || 0),
    menus: Number(firstValue(menus as QueryResult<ValueRow>) || 0),
    users: Number(firstValue(users as QueryResult<ValueRow>) || 0),
    purchases: Number(firstValue(purchases as QueryResult<ValueRow>) || 0),
    revenue: Number(firstValue(revenue as QueryResult<ValueRow>) || 0),
    clickChange: previous ? ((current - previous) / previous) * 100 : null,
    latestSync: String(firstValue(latest as QueryResult<ValueRow>) || "") || null,
  };
  const funnelLabels: Record<ConversionFunnelPoint["key"], string> = {
    page_view: "页面浏览",
    add_to_cart: "加入购物车",
    begin_checkout: "开始结账",
    purchase: "完成购买",
  };
  const funnelRows = funnel.results as Array<{ key: ConversionFunnelPoint["key"]; count: number }>;
  const funnelData = (["page_view", "add_to_cart", "begin_checkout", "purchase"] as const).map((key) => ({
    key,
    label: funnelLabels[key],
    count: Number(funnelRows.find((row) => row.key === key)?.count || 0),
  }));
  return {
    summary,
    trend,
    trafficTrend: traffic.results,
    funnel: funnelData,
    deviceBreakdown: devices.results as DeviceBreakdownPoint[],
    topPages: topPages.results,
    topMenus: topMenus.results,
    recentSyncRuns: recentRuns.results,
  };
}

export async function getMenuReportRows(env: Env, options: DateRangeOptions = {}) {
  const filter = dateFilter("event_date", options);
  const result = await env.DB.prepare(`
    SELECT menu_name AS menuName, menu_key AS menuKey, parent_menu_name AS parentMenuName,
      menu_level AS menuLevel, menu_action AS menuAction, navigation_location AS navigationLocation,
      click_target AS clickTarget, device_category AS deviceCategory, SUM(click_count) AS clickCount
    FROM menu_click_metrics ${filter.clause}
    GROUP BY menu_name, menu_key, parent_menu_name, menu_level, menu_action, navigation_location, click_target, device_category
    ORDER BY clickCount DESC, menuName ASC
  `).bind(...filter.values).all();
  return result.results;
}

export async function getMenuTrend(env: Env, options: DateRangeOptions = {}) {
  const filter = dateFilter("event_date", options);
  const result = await env.DB.prepare(`
    SELECT
      event_date AS date,
      SUM(click_count) AS clicks,
      COUNT(DISTINCT CASE WHEN menu_name <> '' THEN menu_name END) AS menus
    FROM menu_click_metrics ${filter.clause}
    GROUP BY event_date
    ORDER BY event_date ASC
  `).bind(...filter.values).all();
  return result.results;
}

export async function getSiteMetricRows(env: Env, options: DateRangeOptions = {}) {
  const filter = dateFilter("event_date", options);
  const result = await env.DB.prepare(`
    SELECT event_date AS date, device_category AS deviceCategory, event_name AS eventName,
      SUM(event_count) AS eventCount, SUM(total_users) AS totalUsers, SUM(total_revenue) AS totalRevenue
    FROM site_metrics ${filter.clause}
    GROUP BY event_date, device_category, event_name
    ORDER BY event_date ASC, eventName ASC
  `).bind(...filter.values).all();
  return result.results;
}

export async function getGlobalClickReport(env: Env, options: { pagePath?: string; startDate?: string; endDate?: string }) {
  const where: string[] = [];
  const values: string[] = [];
  if (options.pagePath) { where.push("page_path = ?"); values.push(options.pagePath); }
  if (options.startDate) { where.push("event_date >= ?"); values.push(options.startDate); }
  if (options.endDate) { where.push("event_date <= ?"); values.push(options.endDate); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const pathFilter = dateFilter("event_date", options);
  const [paths, rows] = await env.DB.batch([
    env.DB.prepare(`SELECT page_path AS value FROM global_click_metrics ${pathFilter.clause} GROUP BY page_path ORDER BY SUM(click_count) DESC, page_path ASC`).bind(...pathFilter.values),
    env.DB.prepare(`
      SELECT MIN(event_date) AS date, device_category AS deviceCategory, page_path AS pagePath,
        element_key AS elementKey, element_label AS elementLabel, page_section AS pageSection,
        destination_path AS destinationPath, click_target AS clickTarget, SUM(click_count) AS clickCount
      FROM global_click_metrics ${clause}
      GROUP BY device_category, page_path, element_key, element_label, page_section, destination_path, click_target
      ORDER BY clickCount DESC, pagePath ASC, elementKey ASC
    `).bind(...values),
  ]);
  return {
    paths: (paths.results as Array<{ value: string }>).map((row) => row.value),
    rows: rows.results,
  };
}

export async function getGlobalClickTrend(env: Env, options: DateRangeOptions = {}) {
  const filter = dateFilter("event_date", options);
  const result = await env.DB.prepare(`
    SELECT
      event_date AS date,
      SUM(click_count) AS clicks,
      COUNT(DISTINCT CASE WHEN element_key <> '' THEN element_key END) AS elements,
      COUNT(DISTINCT CASE WHEN page_path <> '' THEN page_path END) AS pages
    FROM global_click_metrics ${filter.clause}
    GROUP BY event_date
    ORDER BY event_date ASC
  `).bind(...filter.values).all();
  return result.results;
}

export async function getAnalyticsDataset(env: Env, options: DateRangeOptions = {}) {
  const [overview, menuRows, siteMetrics] = await Promise.all([
    getAnalyticsOverview(env, options),
    getMenuReportRows(env, options),
    getSiteMetricRows(env, options),
  ]);
  return {
    summary: overview.summary,
    trend: overview.trend,
    menuRows,
    siteMetrics,
    claritySnapshot: null,
  };
}
