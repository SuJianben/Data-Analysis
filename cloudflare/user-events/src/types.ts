import type { SiteKey } from "./sites";

export interface Env {
  DB: D1Database;
  SNAPSHOT_KV: KVNamespace;
  ALLOWED_ORIGINS: string;
  EVENT_FORWARD_URL: string;
  SERVICE_NAME: string;
  READ_API_KEY: string;
  SERVER_INGEST_KEY: string;
}

export type { SiteKey } from "./sites";

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

export type UserEventPayload = {
  siteKey: SiteKey;
  source: string;
  events: UserEventInput[];
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
