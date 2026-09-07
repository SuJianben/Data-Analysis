import { appConfig } from "@/config/env";
import type { GlobalClickMetricInput, HeatmapMetricInput, MenuMetricInput, SiteMetricInput } from "@/types/analytics";
import { resolveGa4AccessToken } from "@/services/connectors/ga4-auth";

type Ga4Value = { value?: string };
type Ga4Row = { dimensionValues?: Ga4Value[]; metricValues?: Ga4Value[] };
type Ga4Response = {
  rows?: Ga4Row[];
  rowCount?: number;
  error?: { message?: string; status?: string };
};

export type Ga4SyncInput = {
  accessToken?: string;
  propertyId?: string;
  startDate: string;
  endDate: string;
};

function normalizeGaDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

async function runReport(propertyId: string, accessToken: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("无法连接 GA4 Reporting API（请求超时）。请检查腾讯云到 Google 的出网代理配置。");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const payload = (await response.json().catch(() => ({}))) as Ga4Response;
  if (!response.ok) {
    const detail = payload.error?.message || `GA4 请求失败（${response.status}）`;
    throw new Error(detail);
  }
  return payload;
}

function dimension(row: Ga4Row, index: number) {
  return row.dimensionValues?.[index]?.value || "";
}

function metric(row: Ga4Row, index: number) {
  const value = Number(row.metricValues?.[index]?.value || 0);
  return Number.isFinite(value) ? value : 0;
}

export async function fetchGa4Data(input: Ga4SyncInput): Promise<{
  menuMetrics: MenuMetricInput[];
  siteMetrics: SiteMetricInput[];
  heatmapMetrics: HeatmapMetricInput[];
  globalClickMetrics: GlobalClickMetricInput[];
  warnings: string[];
}> {
  const accessToken = await resolveGa4AccessToken(input.accessToken);
  const propertyId = input.propertyId || appConfig.ga4PropertyId;
  if (!propertyId) throw new Error("缺少 GA4 Property ID。");

  const dateRanges = [{ startDate: input.startDate, endDate: input.endDate }];
  const [menuReport, siteReport] = await Promise.all([
    runReport(propertyId, accessToken, {
      dateRanges,
      dimensions: [
        { name: "eventName" },
        { name: "date" },
        { name: "deviceCategory" },
        { name: "customEvent:menu_name" },
        { name: "customEvent:menu_key" },
        { name: "customEvent:parent_menu_name" },
        { name: "customEvent:menu_level" },
        { name: "customEvent:menu_action" },
        { name: "customEvent:click_target" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: "header_navigation_click" },
        },
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: "100000",
    }),
    runReport(propertyId, accessToken, {
      dateRanges,
      dimensions: [{ name: "date" }, { name: "deviceCategory" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }, { name: "totalRevenue" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: ["page_view", "add_to_cart", "begin_checkout", "purchase", "header_navigation_click"],
          },
        },
      },
      limit: "100000",
    }),
  ]);

  let heatmapReport: Ga4Response | null = null;
  const warnings: string[] = [];
  try {
    heatmapReport = await runReport(propertyId, accessToken, {
      dateRanges,
      dimensions: [
        { name: "date" },
        { name: "deviceCategory" },
        { name: "pagePath" },
        { name: "customEvent:heatmap_cell" },
        { name: "customEvent:element_group" },
        { name: "customEvent:page_section" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: "page_heatmap_click" },
        },
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: "100000",
    });
  } catch (error) {
    warnings.push(error instanceof Error
       ? `热力数据暂未读取：${error.message}`
      : "热力数据暂未读取。请确认 GA4 已注册 heatmap_cell、element_group、page_section 三个自定义维度。");
  }

  const menuMetrics: MenuMetricInput[] = (menuReport.rows || []).map((row) => ({
    date: normalizeGaDate(dimension(row, 1)),
    deviceCategory: dimension(row, 2) || "unknown",
    menuName: dimension(row, 3) || "(未命名菜单)",
    menuKey: dimension(row, 4),
    parentMenuName: dimension(row, 5),
    menuLevel: dimension(row, 6),
    menuAction: dimension(row, 7),
    navigationLocation: "header",
    clickTarget: dimension(row, 8),
    clickCount: metric(row, 0),
  }));

  const siteMetrics: SiteMetricInput[] = (siteReport.rows || []).map((row) => ({
    date: normalizeGaDate(dimension(row, 0)),
    deviceCategory: dimension(row, 1) || "unknown",
    eventName: dimension(row, 2),
    eventCount: metric(row, 0),
    totalUsers: metric(row, 1),
    totalRevenue: metric(row, 2),
  }));

  const heatmapMetrics: HeatmapMetricInput[] = (heatmapReport?.rows || []).map((row) => ({
    date: normalizeGaDate(dimension(row, 0)),
    deviceCategory: dimension(row, 1) || "unknown",
    pagePath: dimension(row, 2) || "/",
    heatmapCell: dimension(row, 3),
    elementGroup: dimension(row, 4) || "other",
    pageSection: dimension(row, 5) || "other",
    clickCount: metric(row, 0),
  })).filter((row) => /^x\d+_y\d+$/.test(row.heatmapCell));

  let globalClickReport: Ga4Response | null = null;
  try {
    globalClickReport = await runReport(propertyId, accessToken, {
      dateRanges,
      dimensions: [
        { name: "date" },
        { name: "deviceCategory" },
        { name: "pagePath" },
        { name: "customEvent:element_key" },
        { name: "customEvent:element_label" },
        { name: "customEvent:page_section" },
        { name: "customEvent:destination_path" },
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: "global_click" },
        },
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: "100000",
    });
  } catch (error) {
    warnings.push(error instanceof Error
      ? `全局点击数据暂未读取：${error.message}`
      : "全局点击数据暂未读取。请确认 GA4 已注册 element_key、element_label、page_section、destination_path 四个自定义维度。");
  }

  const globalClickMetrics: GlobalClickMetricInput[] = (globalClickReport?.rows || []).map((row) => {
    const elementKey = dimension(row, 3);
    return {
      date: normalizeGaDate(dimension(row, 0)),
      deviceCategory: dimension(row, 1) || "unknown",
      pagePath: dimension(row, 2) || "/",
      elementKey,
      elementLabel: dimension(row, 4),
      pageSection: dimension(row, 5) || "other",
      destinationPath: dimension(row, 6),
      clickTarget: elementKey.split(":")[0] || "other",
      clickCount: metric(row, 0),
    };
  }).filter((row) => Boolean(row.elementKey));

  return { menuMetrics, siteMetrics, heatmapMetrics, globalClickMetrics, warnings };
}
