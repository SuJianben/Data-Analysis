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

export type SiteMetricInput = {
  date: string;
  deviceCategory?: string;
  eventName: string;
  eventCount: number;
  totalUsers?: number;
  totalRevenue?: number;
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

export type AnalyticsImportPayload = {
  source: string;
  period: { start: string; end: string };
  menuMetrics: MenuMetricInput[];
  siteMetrics: SiteMetricInput[];
  globalClickMetrics: GlobalClickMetricInput[];
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
