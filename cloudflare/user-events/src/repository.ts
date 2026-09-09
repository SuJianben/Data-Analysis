import type { Env, UserEventInput, UserSummaryRow, UserTrendPoint } from "./types";
import { nextDate, type DateRangeOptions } from "./date-range";

const RESOLVED_EVENTS_CTE = `
  WITH visitor_accounts AS (
    SELECT
      visitor_id,
      COUNT(DISTINCT CASE WHEN customer_id_hash <> '' THEN customer_id_hash END) AS account_count,
      MAX(NULLIF(customer_id_hash, '')) AS account_hash
    FROM user_events
    GROUP BY visitor_id
  ),
  resolved_user_events AS (
    SELECT
      user_events.*,
      CASE
        WHEN user_events.customer_id_hash <> '' THEN 'customer:' || user_events.customer_id_hash
        WHEN visitor_accounts.account_count = 1 THEN 'customer:' || visitor_accounts.account_hash
        ELSE 'visitor:' || user_events.visitor_id
      END AS identity_key,
      CASE
        WHEN user_events.customer_id_hash <> '' OR visitor_accounts.account_count = 1 THEN 'customer'
        ELSE 'visitor'
      END AS identity_type,
      CASE
        WHEN user_events.customer_id_hash <> '' THEN user_events.customer_id_hash
        WHEN visitor_accounts.account_count = 1 THEN visitor_accounts.account_hash
        ELSE user_events.visitor_id
      END AS identity_id
    FROM user_events
    JOIN visitor_accounts ON visitor_accounts.visitor_id = user_events.visitor_id
  )
`;

function eventDateFilter(options: DateRangeOptions, extra: string[] = []) {
  const conditions = [...extra];
  const values: string[] = [];
  if (options.startDate) { conditions.push("occurred_at >= ?"); values.push(`${options.startDate}T00:00:00.000Z`); }
  if (options.endDate) { conditions.push("occurred_at < ?"); values.push(`${nextDate(options.endDate)}T00:00:00.000Z`); }
  return { clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values };
}

export async function saveEvents(env: Env, source: string, events: UserEventInput[]) {
  const receivedAt = new Date().toISOString();
  const statements = events.map((event) => env.DB.prepare(`
    INSERT INTO user_events (
      source, event_id, visitor_id, customer_id_hash, session_id, event_name, occurred_at,
      page_path, element_key, element_label, page_section, destination_path, click_target,
      device_category, metadata_json, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, event_id) DO NOTHING
  `).bind(
    source,
    event.eventId,
    event.visitorId,
    event.customerIdHash || "",
    event.sessionId || "",
    event.eventName,
    event.occurredAt,
    event.pagePath || "/",
    event.elementKey || "",
    event.elementLabel || "",
    event.pageSection || "",
    event.destinationPath || "",
    event.clickTarget || "",
    event.deviceCategory || "unknown",
    JSON.stringify(event.metadata || {}),
    receivedAt,
  ));
  const results = await env.DB.batch(statements);
  return results.reduce((sum, result) => sum + Number(result.meta.changes || 0), 0);
}

export async function getUserSummaries(env: Env, limit: number, options: DateRangeOptions = {}) {
  const filter = eventDateFilter(options);
  const result = await env.DB.prepare(`${RESOLVED_EVENTS_CTE}
    SELECT
      identity_key AS identityKey,
      identity_type AS identityType,
      identity_id AS identityId,
      MIN(occurred_at) AS firstSeenAt,
      MAX(occurred_at) AS lastSeenAt,
      COUNT(*) AS eventCount,
      COUNT(DISTINCT event_name) AS eventTypes,
      COUNT(DISTINCT page_path) AS pagesVisited,
      COUNT(DISTINCT visitor_id) AS visitorCount,
      SUM(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS purchaseCount
    FROM resolved_user_events
    ${filter.clause}
    GROUP BY identity_key, identity_type, identity_id
    ORDER BY lastSeenAt DESC
    LIMIT ?
  `).bind(...filter.values, limit).all<UserSummaryRow>();
  return result.results;
}

export async function getUserTrend(env: Env, options: DateRangeOptions = {}) {
  const filter = eventDateFilter(options);
  const result = await env.DB.prepare(`${RESOLVED_EVENTS_CTE}
    SELECT
      SUBSTR(occurred_at, 1, 10) AS date,
      COUNT(*) AS events,
      COUNT(DISTINCT identity_key) AS visitors,
      SUM(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS purchases
    FROM resolved_user_events
    ${filter.clause}
    GROUP BY SUBSTR(occurred_at, 1, 10)
    ORDER BY date ASC
  `).bind(...filter.values).all<UserTrendPoint>();
  return result.results;
}

type StoredUserEvent = {
  eventId: string;
  visitorId: string;
  customerIdHash: string;
  sessionId: string;
  eventName: string;
  occurredAt: string;
  pagePath: string;
  elementKey: string;
  elementLabel: string;
  pageSection: string;
  destinationPath: string;
  clickTarget: string;
  deviceCategory: string;
  metadataJson: string;
  receivedAt: string;
};

export async function getUserEvents(env: Env, identityKey: string, limit: number, options: DateRangeOptions = {}) {
  const filter = eventDateFilter(options, ["identity_key = ?"]);
  const result = await env.DB.prepare(`${RESOLVED_EVENTS_CTE}
    SELECT
      event_id AS eventId,
      visitor_id AS visitorId,
      customer_id_hash AS customerIdHash,
      session_id AS sessionId,
      event_name AS eventName,
      occurred_at AS occurredAt,
      page_path AS pagePath,
      element_key AS elementKey,
      element_label AS elementLabel,
      page_section AS pageSection,
      destination_path AS destinationPath,
      click_target AS clickTarget,
      device_category AS deviceCategory,
      metadata_json AS metadataJson,
      received_at AS receivedAt
    FROM resolved_user_events
    ${filter.clause}
    ORDER BY occurred_at DESC
    LIMIT ?
  `).bind(identityKey, ...filter.values, limit).all<StoredUserEvent>();
  return result.results.map((row) => {
    const { metadataJson, ...event } = row;
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(metadataJson || "{}") as Record<string, unknown>;
    } catch {}
    return { ...event, metadata };
  });
}
