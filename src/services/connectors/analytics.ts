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
  GlobalClickReportRow,
  GlobalClickTrendPoint,
  MenuTrendPoint,
  MenuReportRow,
  PageEntryPoint,
  SyncRun,
  TrafficTrendPoint,
  TrendPoint,
} from "@/types/analytics";

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
      recentSyncRuns: getRecentSyncRuns(),
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

export async function loadGlobalClickReport(options: { pagePath?: string; startDate?: string; endDate?: string } = {}) {
  if (!appConfig.userEventApiUrl) {
    return { paths: getGlobalClickPagePaths(), rows: getGlobalClickReportRows(options) };
  }
  const query = new URLSearchParams();
  if (options.pagePath) query.set("pagePath", options.pagePath);
  if (options.startDate) query.set("startDate", options.startDate);
  if (options.endDate) query.set("endDate", options.endDate);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await cloudflareRead<CloudflareEnvelope & { paths: string[]; rows: GlobalClickReportRow[] }>(
    `/analytics/global-clicks${suffix}`,
    { errorLabel: "全局点击报表读取" },
  );
  return { paths: payload.paths || [], rows: payload.rows || [] };
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

export async function loadDataHealthReport(): Promise<DataHealthReport> {
  if (!appConfig.userEventApiUrl) {
    throw new Error("数据健康监控需要先连接 Cloudflare 数据源。");
  }
  const payload = await cloudflareRead<CloudflareEnvelope & { report: DataHealthReport }>("/analytics/health", { errorLabel: "数据健康读取", fresh: true });
  return payload.report;
}
