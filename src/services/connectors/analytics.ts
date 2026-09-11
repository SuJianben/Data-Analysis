import "server-only";

import { appConfig } from "@/config/env";
import { cloudflareRead, type CloudflareEnvelope } from "@/services/connectors/cloudflare-request";
import type { AnalysisDataset } from "@/features/analysis/local-analyzer";
import {
  getClickTrend,
  getDashboardDeviceBreakdown,
  getDashboardFunnel,
  getDashboardTopPages,
  getDashboardTrafficTrend,
  getDashboardSummary,
  getGlobalClickPagePaths,
  getGlobalClickReportRows,
  getGlobalClickTrend,
  getLatestAnalysis,
  getLatestSnapshot,
  getMenuReportRows,
  getMenuTrend,
  getRecentSyncRuns,
  getSiteMetricReportRows,
  getTopMenus,
} from "@/services/database/repositories";
import type {
  AnalysisResult,
  DataHealthReport,
  DashboardSummary,
  DateRangeOptions,
  DeviceBreakdownPoint,
  ConversionFunnelPoint,
  DistributionPoint,
  GlobalClickReport,
  GlobalClickReportQuery,
  GlobalClickReportRow,
  GlobalClickSummary,
  GlobalClickTrendPoint,
  MenuTrendPoint,
  MenuReportRow,
  PageEntryPoint,
  SyncRun,
  TrafficTrendPoint,
  TrendPoint,
} from "@/types/analytics";
import type { SiteKey } from "@/config/sites";

export type DashboardOverview = {
  summary: DashboardSummary;
  trend: TrendPoint[];
  trafficTrend: TrafficTrendPoint[];
  funnel: ConversionFunnelPoint[];
  deviceBreakdown: DeviceBreakdownPoint[];
  topPages: PageEntryPoint[];
  topMenus: MenuReportRow[];
  recentSyncRuns: SyncRun[];
};

function rangeSuffix(options: DateRangeOptions) {
  const query = new URLSearchParams();
  if (options.site) query.set("site", options.site);
  if (options.startDate) query.set("startDate", options.startDate);
  if (options.endDate) query.set("endDate", options.endDate);
  return query.size ? `?${query.toString()}` : "";
}

export async function loadDashboardOverview(options: DateRangeOptions = {}): Promise<DashboardOverview> {
  if (!appConfig.userEventApiUrl) {
    return {
      summary: getDashboardSummary(options),
      trend: getClickTrend(options),
      trafficTrend: getDashboardTrafficTrend(options),
      funnel: getDashboardFunnel(options),
      deviceBreakdown: getDashboardDeviceBreakdown(options),
      topPages: getDashboardTopPages(options),
      topMenus: getTopMenus(6, options),
      recentSyncRuns: getRecentSyncRuns(6, options.site),
    };
  }
  const payload = await cloudflareRead<CloudflareEnvelope & DashboardOverview>(`/analytics/overview${rangeSuffix(options)}`, { errorLabel: "Cloudflare 报表读取" });
  return {
    summary: payload.summary,
    trend: payload.trend,
    trafficTrend: payload.trafficTrend || [],
    funnel: payload.funnel || [],
    deviceBreakdown: payload.deviceBreakdown || [],
    topPages: payload.topPages || [],
    topMenus: payload.topMenus,
    recentSyncRuns: payload.recentSyncRuns,
  };
}

export async function loadMenuReportRows(options: DateRangeOptions = {}): Promise<MenuReportRow[]> {
  if (!appConfig.userEventApiUrl) return getMenuReportRows(options);
  const payload = await cloudflareRead<CloudflareEnvelope & { rows: MenuReportRow[] }>(`/analytics/menus${rangeSuffix(options)}`, { errorLabel: "菜单报表读取" });
  return payload.rows || [];
}

export async function loadMenuTrend(options: DateRangeOptions = {}): Promise<MenuTrendPoint[]> {
  if (!appConfig.userEventApiUrl) return getMenuTrend(options);
  const payload = await cloudflareRead<CloudflareEnvelope & { trend: MenuTrendPoint[] }>(`/analytics/menu-trend${rangeSuffix(options)}`, { errorLabel: "菜单趋势读取" });
  return payload.trend || [];
}

function aggregateLocalGlobalClicks(rows: GlobalClickReportRow[]) {
  const grouped = new Map<string, GlobalClickReportRow>();
  for (const row of rows) {
    const key = [row.deviceCategory, row.pagePath, row.elementKey, row.elementLabel, row.pageSection, row.destinationPath, row.clickTarget].join("\u001f");
    const current = grouped.get(key);
    if (current) current.clickCount += Number(row.clickCount || 0);
    else grouped.set(key, { ...row, clickCount: Number(row.clickCount || 0) });
  }
  return Array.from(grouped.values()).sort((a, b) => b.clickCount - a.clickCount || a.pagePath.localeCompare(b.pagePath));
}

function localGlobalClickSummary(rows: GlobalClickReportRow[]): GlobalClickSummary {
  const devices = new Map<string, number>();
  const distribution = new Map<string, { label: string; clicks: number; pages: Set<string> }>();
  const elements = new Set<string>();
  const pages = new Set<string>();
  let totalClicks = 0;
  for (const row of rows) {
    const clicks = Number(row.clickCount || 0);
    totalClicks += clicks;
    if (row.elementKey) elements.add(row.elementKey);
    if (row.pagePath) pages.add(row.pagePath);
    const device = row.deviceCategory || "unknown";
    devices.set(device, (devices.get(device) || 0) + clicks);
    const id = row.elementKey || row.elementLabel || row.pagePath || "unknown";
    const point = distribution.get(id) || { label: row.elementLabel || row.elementKey || "未命名元素", clicks: 0, pages: new Set<string>() };
    point.clicks += clicks;
    if (row.pagePath) point.pages.add(row.pagePath);
    distribution.set(id, point);
  }
  return {
    totalClicks,
    elementCount: elements.size,
    pageCount: pages.size,
    devices: Array.from(devices, ([deviceCategory, value]) => ({ deviceCategory, value })).sort((a, b) => b.value - a.value),
    distribution: Array.from(distribution, ([id, point]): DistributionPoint => ({
      id,
      label: point.label,
      x: point.clicks,
      y: point.pages.size,
      category: "default",
      details: [`页面覆盖：${point.pages.size} 个`],
    })).filter((point) => point.x > 0).sort((a, b) => b.x - a.x),
  };
}

export async function loadGlobalClickReport(options: GlobalClickReportQuery = {}): Promise<GlobalClickReport> {
  if (!appConfig.userEventApiUrl) {
    const rawPageSize = Number(options.pageSize);
    const rawPage = Number(options.page);
    const pageSize = Number.isFinite(rawPageSize) ? Math.min(Math.max(Math.floor(rawPageSize), 1), 100) : 20;
    const requestedPage = Number.isFinite(rawPage) ? Math.max(Math.floor(rawPage), 1) : 1;
    const query = (options.query || "").toLowerCase();
    const filtered = aggregateLocalGlobalClicks(getGlobalClickReportRows(options)).filter((row) => {
      const haystack = [row.pagePath, row.elementKey, row.elementLabel, row.destinationPath, row.pageSection].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (!options.device || options.device === "all" || row.deviceCategory === options.device);
    });
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(requestedPage, totalPages);
    return {
      paths: getGlobalClickPagePaths(options.site),
      rows: filtered.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        totalValue: filtered.reduce((sum, row) => sum + row.clickCount, 0),
      },
    };
  }
  const query = new URLSearchParams();
  if (options.pagePath) query.set("pagePath", options.pagePath);
  if (options.site) query.set("site", options.site);
  if (options.startDate) query.set("startDate", options.startDate);
  if (options.endDate) query.set("endDate", options.endDate);
  if (options.query) query.set("query", options.query);
  if (options.device && options.device !== "all") query.set("device", options.device);
  if (options.page) query.set("page", String(options.page));
  if (options.pageSize) query.set("pageSize", String(options.pageSize));
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await cloudflareRead<CloudflareEnvelope & GlobalClickReport>(
    `/analytics/global-clicks${suffix}`,
    { errorLabel: "全局点击报表读取" },
  );
  return {
    paths: payload.paths || [],
    rows: payload.rows || [],
    pagination: payload.pagination,
  };
}

export async function loadGlobalClickSummary(options: DateRangeOptions = {}): Promise<GlobalClickSummary> {
  if (!appConfig.userEventApiUrl) return localGlobalClickSummary(getGlobalClickReportRows(options));
  const payload = await cloudflareRead<CloudflareEnvelope & { summary: GlobalClickSummary }>(
    `/analytics/global-click-summary${rangeSuffix(options)}`,
    { errorLabel: "全局点击汇总读取" },
  );
  return payload.summary;
}

export async function loadGlobalClickTrend(options: DateRangeOptions = {}): Promise<GlobalClickTrendPoint[]> {
  if (!appConfig.userEventApiUrl) return getGlobalClickTrend(options);
  const payload = await cloudflareRead<CloudflareEnvelope & { trend: GlobalClickTrendPoint[] }>(`/analytics/global-click-trend${rangeSuffix(options)}`, { errorLabel: "全局点击趋势读取" });
  return payload.trend || [];
}

export async function loadAnalysisDataset(options: DateRangeOptions = {}): Promise<AnalysisDataset> {
  if (!appConfig.userEventApiUrl) {
    return {
      summary: getDashboardSummary(options),
      menuRows: getMenuReportRows(options),
      trend: getClickTrend(options),
      siteMetrics: getSiteMetricReportRows(options),
      claritySnapshot: getLatestSnapshot("clarity"),
    };
  }
  const payload = await cloudflareRead<CloudflareEnvelope & { dataset: AnalysisDataset }>(`/analytics/dataset${rangeSuffix(options)}`, { errorLabel: "分析数据读取" });
  return payload.dataset;
}

export async function loadLatestAnalysis(): Promise<AnalysisResult | null> {
  return appConfig.userEventApiUrl ? null : getLatestAnalysis();
}

export async function loadDataHealthReport(site: SiteKey): Promise<DataHealthReport> {
  if (!appConfig.userEventApiUrl) {
    throw new Error("数据健康监控需要先连接 Cloudflare 数据源。");
  }
  const payload = await cloudflareRead<CloudflareEnvelope & { report: DataHealthReport }>(`/analytics/health?site=${site}`, { errorLabel: "数据健康读取", fresh: true });
  return payload.report;
}
