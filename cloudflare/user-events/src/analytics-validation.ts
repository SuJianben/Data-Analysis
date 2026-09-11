import type {
  AnalyticsImportPayload,
  GlobalClickMetricInput,
  MenuMetricInput,
  SiteMetricInput,
} from "./analytics-types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IMPORT_ROWS = 900;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`${field} 格式不正确。`);
  }
  return value;
}

function optionalString(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) throw new Error(`${field} 格式不正确。`);
  return value;
}

function dateString(value: unknown, field: string) {
  const date = requiredString(value, field, 10);
  if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${field} 必须是有效的 YYYY-MM-DD 日期。`);
  }
  return date;
}

function nonNegativeNumber(value: unknown, field: string, fallback?: number) {
  if ((value === undefined || value === null) && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} 必须是非负数。`);
  }
  return value;
}

function parseMenuMetric(value: unknown): MenuMetricInput {
  if (!isRecord(value)) throw new Error("菜单指标格式不正确。");
  return {
    date: dateString(value.date, "menuMetrics.date"),
    deviceCategory: optionalString(value.deviceCategory, "deviceCategory", 40),
    menuName: requiredString(value.menuName, "menuName", 300),
    menuKey: optionalString(value.menuKey, "menuKey", 300),
    parentMenuName: optionalString(value.parentMenuName, "parentMenuName", 300),
    menuLevel: optionalString(value.menuLevel, "menuLevel", 80),
    menuAction: optionalString(value.menuAction, "menuAction", 120),
    navigationLocation: optionalString(value.navigationLocation, "navigationLocation", 120),
    clickTarget: optionalString(value.clickTarget, "clickTarget", 300),
    clickCount: nonNegativeNumber(value.clickCount, "clickCount"),
  };
}

function parseSiteMetric(value: unknown): SiteMetricInput {
  if (!isRecord(value)) throw new Error("站点指标格式不正确。");
  return {
    date: dateString(value.date, "siteMetrics.date"),
    deviceCategory: optionalString(value.deviceCategory, "deviceCategory", 40),
    eventName: requiredString(value.eventName, "eventName", 120),
    eventCount: nonNegativeNumber(value.eventCount, "eventCount"),
    totalUsers: nonNegativeNumber(value.totalUsers, "totalUsers", 0),
    totalRevenue: nonNegativeNumber(value.totalRevenue, "totalRevenue", 0),
  };
}

function parseGlobalClickMetric(value: unknown): GlobalClickMetricInput {
  if (!isRecord(value)) throw new Error("全局点击指标格式不正确。");
  return {
    date: dateString(value.date, "globalClickMetrics.date"),
    deviceCategory: optionalString(value.deviceCategory, "deviceCategory", 40),
    pagePath: requiredString(value.pagePath, "pagePath", 2_000),
    elementKey: requiredString(value.elementKey, "elementKey", 300),
    elementLabel: optionalString(value.elementLabel, "elementLabel", 500),
    pageSection: optionalString(value.pageSection, "pageSection", 200),
    destinationPath: optionalString(value.destinationPath, "destinationPath", 2_000),
    clickTarget: optionalString(value.clickTarget, "clickTarget", 300),
    clickCount: nonNegativeNumber(value.clickCount, "clickCount"),
  };
}

function parseArray<T>(value: unknown, parser: (item: unknown) => T) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("指标列表格式不正确。");
  return value.map(parser);
}

export function parseAnalyticsImportPayload(value: unknown): AnalyticsImportPayload {
  if (!isRecord(value)) throw new Error("报表导入内容格式不正确。");
  if (!isRecord(value.period)) throw new Error("同步日期范围格式不正确。");
  const siteKey = value.siteKey === undefined ? "tkf" : requiredString(value.siteKey, "siteKey", 3);
  if (siteKey !== "tkf" && siteKey !== "tms") throw new Error("siteKey 只支持 tkf 或 tms。");
  const payload: AnalyticsImportPayload = {
    siteKey,
    source: requiredString(value.source, "source", 80),
    period: {
      start: dateString(value.period.start, "period.start"),
      end: dateString(value.period.end, "period.end"),
    },
    menuMetrics: parseArray(value.menuMetrics, parseMenuMetric),
    siteMetrics: parseArray(value.siteMetrics, parseSiteMetric),
    globalClickMetrics: parseArray(value.globalClickMetrics, parseGlobalClickMetric),
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
  };
  if (payload.period.start > payload.period.end) throw new Error("同步开始日期不能晚于结束日期。");
  const rowCount = payload.menuMetrics.length + payload.siteMetrics.length + payload.globalClickMetrics.length;
  if (!rowCount || rowCount > MAX_IMPORT_ROWS) {
    throw new Error(`每次需要导入 1 至 ${MAX_IMPORT_ROWS} 行报表数据。`);
  }
  return payload;
}
