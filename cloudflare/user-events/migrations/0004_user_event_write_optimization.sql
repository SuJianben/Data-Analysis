DROP INDEX IF EXISTS idx_user_events_visitor_time;
DROP INDEX IF EXISTS idx_user_events_customer_time;
DROP INDEX IF EXISTS idx_user_events_occurred_at;

CREATE INDEX IF NOT EXISTS idx_user_events_site_customer_time
  ON user_events(site_key, customer_id_hash, occurred_at DESC)
  WHERE customer_id_hash <> '';
