import { db } from "@/services/database/db";
import type { UserEventInput, UserEventRow, UserSummaryRow } from "@/types/analytics";

const isoNow = () => new Date().toISOString();

const RESOLVED_USER_EVENTS_CTE = `
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

export function saveUserEvents(source: string, rows: UserEventInput[]) {
  const statement = db.prepare(`
    INSERT INTO user_events (
      source, event_id, visitor_id, customer_id_hash, session_id, event_name, occurred_at,
      page_path, element_key, element_label, page_section, destination_path, click_target,
      device_category, metadata_json, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, event_id) DO NOTHING
  `);
  const receivedAt = isoNow();
  let inserted = 0;
  const insertRows = db.transaction((eventRows: UserEventInput[]) => {
    for (const row of eventRows) {
      const result = statement.run(
        source,
        row.eventId,
        row.visitorId,
        row.customerIdHash || "",
        row.sessionId || "",
        row.eventName,
        row.occurredAt,
        row.pagePath || "/",
        row.elementKey || "",
        row.elementLabel || "",
        row.pageSection || "",
        row.destinationPath || "",
        row.clickTarget || "",
        row.deviceCategory || "unknown",
        JSON.stringify(row.metadata || {}),
        receivedAt,
      );
      inserted += result.changes;
    }
  });
  insertRows(rows);
  return inserted;
}

export function getUserSummaries(limit = 200): UserSummaryRow[] {
  return db.prepare(`${RESOLVED_USER_EVENTS_CTE}
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
    GROUP BY identity_key, identity_type, identity_id
    ORDER BY lastSeenAt DESC
    LIMIT ?
  `).all(limit) as UserSummaryRow[];
}

export function getUserEvents(identityKey: string, limit = 500): UserEventRow[] {
  const rows = db.prepare(`${RESOLVED_USER_EVENTS_CTE}
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
    WHERE identity_key = ?
    ORDER BY occurred_at DESC
    LIMIT ?
  `).all(identityKey, limit) as (Omit<UserEventRow, "metadata"> & { metadataJson: string })[];
  return rows.map((row) => ({
    ...row,
    metadata: JSON.parse(row.metadataJson || "{}") as Record<string, unknown>,
  })) as UserEventRow[];
}
