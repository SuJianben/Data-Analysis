CREATE TABLE menu_click_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  event_date TEXT NOT NULL,
  device_category TEXT NOT NULL DEFAULT 'unknown',
  menu_name TEXT NOT NULL,
  menu_key TEXT NOT NULL DEFAULT '',
  parent_menu_name TEXT NOT NULL DEFAULT '',
  menu_level TEXT NOT NULL DEFAULT '',
  menu_action TEXT NOT NULL DEFAULT '',
  navigation_location TEXT NOT NULL DEFAULT 'header',
  click_target TEXT NOT NULL DEFAULT '',
  click_count INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL,
  UNIQUE(source, event_date, device_category, menu_key, menu_name, parent_menu_name, menu_action, click_target)
);

CREATE TABLE site_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  event_date TEXT NOT NULL,
  device_category TEXT NOT NULL DEFAULT 'unknown',
  event_name TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  total_revenue REAL NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL,
  UNIQUE(source, event_date, device_category, event_name)
);

CREATE TABLE global_click_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  event_date TEXT NOT NULL,
  device_category TEXT NOT NULL DEFAULT 'unknown',
  page_path TEXT NOT NULL DEFAULT '/',
  element_key TEXT NOT NULL,
  element_label TEXT NOT NULL DEFAULT '',
  page_section TEXT NOT NULL DEFAULT 'other',
  destination_path TEXT NOT NULL DEFAULT '',
  click_target TEXT NOT NULL DEFAULT 'other',
  click_count INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL,
  UNIQUE(source, event_date, device_category, page_path, element_key, element_label, page_section, destination_path, click_target)
);

CREATE TABLE analytics_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  row_count INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  imported_at TEXT NOT NULL,
  UNIQUE(source, period_start, period_end)
);

CREATE INDEX idx_menu_metrics_date ON menu_click_metrics(event_date);
CREATE INDEX idx_site_metrics_date_event ON site_metrics(event_date, event_name);
CREATE INDEX idx_global_click_metrics_date_path ON global_click_metrics(event_date, page_path);
CREATE INDEX idx_analytics_sync_runs_imported_at ON analytics_sync_runs(imported_at DESC);
