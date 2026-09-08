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
