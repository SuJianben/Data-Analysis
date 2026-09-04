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

export type TrendPoint = {
  date: string;
  clicks: number;
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

export type UserSummaryRow = {
  visitorId: string;
  customerIdHash: string;
  firstSeenAt: string;
  lastSeenAt: string;
  eventCount: number;
  eventTypes: number;
  pagesVisited: number;
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
