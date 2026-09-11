export type MenuMetricInput = {
  date: string;
  deviceCategory?: string;
  menuName: string;
  menuKey?: string;
  parentMenuName?: string;
  menuLevel?: string;
  menuAction?: string;
  navigationLocation?: string;
  clickTarget?: string;
  clickCount: number;
};

export type Ga4CredentialMode = "oauth" | "service_account" | "access_token" | "none";

export type SiteMetricInput = {
  date: string;
  deviceCategory?: string;
  eventName: string;
  eventCount: number;
  totalUsers?: number;
  totalRevenue?: number;
};

export type HeatmapMetricInput = {
  date: string;
  deviceCategory?: string;
  pagePath: string;
  heatmapCell: string;
  elementGroup?: string;
  pageSection?: string;
  clickTarget?: string;
  scrollBucket?: string;
  clickCount: number;
};

export type GlobalClickMetricInput = {
  date: string;
  deviceCategory?: string;
  pagePath: string;
  elementKey: string;
  elementLabel?: string;
  pageSection?: string;
  destinationPath?: string;
  clickTarget?: string;
  clickCount: number;
};

export type UserEventInput = {
  eventId: string;
  visitorId: string;
  customerIdHash?: string;
  sessionId?: string;
  eventName: string;
  occurredAt: string;
  pagePath?: string;
  elementKey?: string;
  elementLabel?: string;
  pageSection?: string;
  destinationPath?: string;
  clickTarget?: string;
  deviceCategory?: string;
  metadata?: Record<string, unknown>;
};

export type DataImportPayload = {
  source: string;
  period: { start: string; end: string };
  menuMetrics?: MenuMetricInput[];
  siteMetrics?: SiteMetricInput[];
  heatmapMetrics?: HeatmapMetricInput[];
  globalClickMetrics?: GlobalClickMetricInput[];
  userEvents?: UserEventInput[];
  metadata?: Record<string, unknown>;
};

export type DashboardSummary = {
  clicks: number;
  menus: number;
  users: number;
  purchases: number;
  revenue: number;
  clickChange: number | null;
  latestSync: string | null;
};

export type DateRangeOptions = {
  startDate?: string;
  endDate?: string;
};

export type DataHealthStatus = "healthy" | "attention" | "critical";

export type DataHealthCheck = {
  key: "sync_freshness" | "data_continuity" | "field_quality" | "volume_change";
  name: string;
  description: string;
  status: DataHealthStatus;
  value: string;
  detail: string;
  recommendation: string;
};

export type DataHealthDailyPoint = {
  date: string;
  menuClicks: number;
  globalClicks: number;
  siteEvents: number;
  userEvents: number;
  analyticsTotal: number;
};

export type DataHealthReport = {
  overallStatus: DataHealthStatus;
  generatedAt: string;
  window: {
    startDate: string;
    endDate: string;
    availableDays: number;
    expectedDays: number;
    missingDates: string[];
  };
  latestSync: {
    importedAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    rowCount: number;
    delayHours: number | null;
  };
  quality: {
    observedCount: number;
    invalidCount: number;
    validRate: number;
  };
  daily: DataHealthDailyPoint[];
  checks: DataHealthCheck[];
};

export type TrendPoint = {
  date: string;
  clicks: number;
};

export type TrafficTrendPoint = {
  date: string;
  pageViews: number;
  users: number;
  sessions: number;
};

export type ConversionFunnelPoint = {
  key: "page_view" | "add_to_cart" | "begin_checkout" | "purchase";
  label: string;
  count: number;
};

export type DeviceBreakdownPoint = {
  deviceCategory: string;
  pageViews: number;
  users: number;
  purchases: number;
  revenue: number;
};

export type PageEntryPoint = {
  pagePath: string;
  clicks: number;
};

export type MenuTrendPoint = {
  date: string;
  clicks: number;
  menus: number;
};

export type GlobalClickTrendPoint = {
  date: string;
  clicks: number;
  elements: number;
  pages: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  totalValue: number;
};

export type UserTrendPoint = {
  date: string;
  events: number;
  visitors: number;
  purchases: number;
};

export type DeviceStatPoint = {
  deviceCategory: string;
  value: number;
};

export type DistributionPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  category: "visitor" | "customer" | "default";
  details: string[];
};

export type MenuReportRow = {
  menuName: string;
  menuKey: string;
  parentMenuName: string;
  menuLevel: string;
  menuAction: string;
  navigationLocation: string;
  clickTarget: string;
  deviceCategory: string;
  clickCount: number;
};

export type HeatmapReportRow = HeatmapMetricInput;
export type GlobalClickReportRow = GlobalClickMetricInput;

export type GlobalClickReportQuery = DateRangeOptions & {
  pagePath?: string;
  query?: string;
  device?: string;
  page?: number;
  pageSize?: number;
};

export type GlobalClickReport = {
  paths: string[];
  rows: GlobalClickReportRow[];
  pagination: PaginationMeta;
};

export type GlobalClickSummary = {
  totalClicks: number;
  elementCount: number;
  pageCount: number;
  devices: DeviceStatPoint[];
  distribution: DistributionPoint[];
};

export type UserSummaryRow = {
  identityKey: string;
  identityType: "customer" | "visitor";
  identityId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  eventCount: number;
  eventTypes: number;
  pagesVisited: number;
  visitorCount: number;
  purchaseCount: number;
};

export type UserEventRow = UserEventInput & { receivedAt: string };

export type SyncRun = {
  id: number;
  source: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  finishedAt: string | null;
  rowCount: number;
  message: string;
};

export type AnalysisFinding = {
  title: string;
  evidence: string;
  recommendation: string;
  severity: "info" | "attention" | "important";
};

export type AnalysisResult = {
  mode: "local" | "ai";
  generatedAt: string;
  headline: string;
  summary: string;
  findings: AnalysisFinding[];
  nextActions: string[];
};
