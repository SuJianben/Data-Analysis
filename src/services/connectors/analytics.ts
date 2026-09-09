import "server-only";

import { appConfig } from "@/config/env";
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
  getLatestAnalysis,
  getLatestSnapshot,
  getMenuReportRows,
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

type ApiEnvelope = { ok: boolean; error?: string };

async function remoteRequest<T extends ApiEnvelope>(path: string): Promise<T> {
  if (!appConfig.userEventApiUrl || !appConfig.userEventReadKey) {
    throw new Error("Cloudflare 报表数据源配置不完整。");
  }
  const response = await fetch(`${appConfig.userEventApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${appConfig.userEventReadKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let payload: T;
  try {
    payload = JSON.parse(text) as T;
  } catch {
    throw new Error(`Cloudflare 报表接口返回了非 JSON 内容（HTTP ${response.status}）。`);
  }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Cloudflare 报表读取失败（HTTP ${response.status}）。`);
  }
  return payload;
}

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
  const payload = await remoteRequest<ApiEnvelope & DashboardOverview>(`/analytics/overview${rangeSuffix(options)}`);
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
  const payload = await remoteRequest<ApiEnvelope & { rows: MenuReportRow[] }>(`/analytics/menus${rangeSuffix(options)}`);
  return payload.rows || [];
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
  const payload = await remoteRequest<ApiEnvelope & { paths: string[]; rows: GlobalClickReportRow[] }>(
    `/analytics/global-clicks${suffix}`,
  );
  return { paths: payload.paths || [], rows: payload.rows || [] };
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
  const payload = await remoteRequest<ApiEnvelope & { dataset: AnalysisDataset }>(`/analytics/dataset${rangeSuffix(options)}`);
  return payload.dataset;
}

export async function loadLatestAnalysis(): Promise<AnalysisResult | null> {
  return appConfig.userEventApiUrl ? null : getLatestAnalysis();
}

export async function loadDataHealthReport(): Promise<DataHealthReport> {
  if (!appConfig.userEventApiUrl) {
    throw new Error("数据健康监控需要先连接 Cloudflare 数据源。");
  }
  const payload = await remoteRequest<ApiEnvelope & { report: DataHealthReport }>("/analytics/health");
  return payload.report;
}
