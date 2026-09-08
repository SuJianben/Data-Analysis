CREATE TABLE IF NOT EXISTS user_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  event_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  customer_id_hash TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT '',
  event_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  element_key TEXT NOT NULL DEFAULT '',
  element_label TEXT NOT NULL DEFAULT '',
  page_section TEXT NOT NULL DEFAULT '',
  destination_path TEXT NOT NULL DEFAULT '',
  click_target TEXT NOT NULL DEFAULT '',
  device_category TEXT NOT NULL DEFAULT 'unknown',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  received_at TEXT NOT NULL,
  UNIQUE(source, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_events_visitor_time
  ON user_events(visitor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_customer_time
  ON user_events(customer_id_hash, occurred_at DESC)
  WHERE customer_id_hash <> '';

CREATE INDEX IF NOT EXISTS idx_user_events_occurred_at
  ON user_events(occurred_at DESC);
