ALTER TABLE user_events ADD COLUMN site_key TEXT NOT NULL DEFAULT 'tkf';
ALTER TABLE menu_click_metrics ADD COLUMN site_key TEXT NOT NULL DEFAULT 'tkf';
ALTER TABLE site_metrics ADD COLUMN site_key TEXT NOT NULL DEFAULT 'tkf';
ALTER TABLE global_click_metrics ADD COLUMN site_key TEXT NOT NULL DEFAULT 'tkf';
ALTER TABLE analytics_sync_runs ADD COLUMN site_key TEXT NOT NULL DEFAULT 'tkf';

CREATE INDEX idx_user_events_site_time ON user_events(site_key, occurred_at DESC);
CREATE INDEX idx_user_events_site_visitor_time ON user_events(site_key, visitor_id, occurred_at DESC);
CREATE INDEX idx_menu_metrics_site_date ON menu_click_metrics(site_key, event_date);
CREATE INDEX idx_site_metrics_site_date_event ON site_metrics(site_key, event_date, event_name);
CREATE INDEX idx_global_click_metrics_site_date_path ON global_click_metrics(site_key, event_date, page_path);
CREATE INDEX idx_analytics_sync_runs_site_time ON analytics_sync_runs(site_key, imported_at DESC);
