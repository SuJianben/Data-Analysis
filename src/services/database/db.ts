import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DEPLOY_SNAPSHOT_PATH = path.join(DATA_DIRECTORY, "analytics-deploy.db");
const RUNTIME_DATA_DIRECTORY = path.join("/tmp", "multi-site-analytics");

function databasePath() {
  if (process.env.ANALYTICS_DATABASE_PATH) return path.resolve(process.env.ANALYTICS_DATABASE_PATH);
  if (process.env.TKF_DATABASE_PATH) return path.resolve(process.env.TKF_DATABASE_PATH);
  if (!process.env.VERCEL) return path.join(DATA_DIRECTORY, "analytics.db");

  mkdirSync(RUNTIME_DATA_DIRECTORY, { recursive: true });
  const snapshotVersion = existsSync(DEPLOY_SNAPSHOT_PATH)
    ? createHash("sha256").update(readFileSync(DEPLOY_SNAPSHOT_PATH)).digest("hex").slice(0, 16)
    : "empty";
  const runtimePath = path.join(RUNTIME_DATA_DIRECTORY, `analytics-${snapshotVersion}.db`);
  if (!existsSync(runtimePath) && existsSync(DEPLOY_SNAPSHOT_PATH)) {
    copyFileSync(DEPLOY_SNAPSHOT_PATH, runtimePath);
  }
  return runtimePath;
}

type GlobalWithDatabase = typeof globalThis & {
  __multiSiteAnalyticsDatabase?: Database.Database;
};

function executeWithBusyRetry(database: Database.Database, sql: string) {
  const retryDelay = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      database.exec(sql);
      return;
    } catch (error) {
      const isBusy = error instanceof Error && "code" in error && error.code === "SQLITE_BUSY";
      if (!isBusy || attempt === 19) throw error;
      Atomics.wait(retryDelay, 0, 0, 100);
    }
  }
}

function createDatabase() {
  const resolvedDatabasePath = databasePath();
  mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });
  const database = new Database(resolvedDatabasePath);
  database.pragma("busy_timeout = 5000");
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  executeWithBusyRetry(database, `
    CREATE TABLE IF NOT EXISTS menu_click_metrics (
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

    CREATE TABLE IF NOT EXISTS site_metrics (
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

    CREATE TABLE IF NOT EXISTS heatmap_click_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      event_date TEXT NOT NULL,
      device_category TEXT NOT NULL DEFAULT 'unknown',
      page_path TEXT NOT NULL DEFAULT '/',
      heatmap_cell TEXT NOT NULL,
      element_group TEXT NOT NULL DEFAULT 'other',
      page_section TEXT NOT NULL DEFAULT 'other',
      click_target TEXT NOT NULL DEFAULT '',
      scroll_bucket TEXT NOT NULL DEFAULT '0',
      click_count INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT NOT NULL,
      UNIQUE(source, event_date, device_category, page_path, heatmap_cell, element_group, page_section, click_target, scroll_bucket)
    );

    CREATE TABLE IF NOT EXISTS global_click_metrics (
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

    CREATE TABLE IF NOT EXISTS data_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      row_count INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      key TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

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
    CREATE INDEX IF NOT EXISTS idx_user_events_occurred_at
      ON user_events(occurred_at DESC);
  `);
  const siteScopedTables = [
    "menu_click_metrics",
    "site_metrics",
    "heatmap_click_metrics",
    "global_click_metrics",
    "data_snapshots",
    "sync_runs",
    "analyses",
    "user_events",
  ];
  for (const table of siteScopedTables) {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === "site_key")) {
      executeWithBusyRetry(database, `ALTER TABLE ${table} ADD COLUMN site_key TEXT NOT NULL DEFAULT 'tkf'`);
    }
  }
  const userEventColumns = database.prepare("PRAGMA table_info(user_events)").all() as Array<{ name: string }>;
  if (!userEventColumns.some((column) => column.name === "is_shadowed")) {
    executeWithBusyRetry(database, "ALTER TABLE user_events ADD COLUMN is_shadowed INTEGER NOT NULL DEFAULT 0");
  }
  const shadowMigrationKey = "2026-09-18-shadow-legacy-duplicates-v1";
  const shadowMigrationApplied = database.prepare("SELECT 1 FROM schema_migrations WHERE key = ?").get(shadowMigrationKey);
  if (!shadowMigrationApplied) {
    executeWithBusyRetry(database, `
      DROP TABLE IF EXISTS temp.shadow_pixel_signatures;
      CREATE TEMP TABLE shadow_pixel_signatures (signature TEXT PRIMARY KEY) WITHOUT ROWID;
      INSERT OR IGNORE INTO shadow_pixel_signatures (signature)
      SELECT pixel.site_key || CHAR(31) || pixel.event_name || CHAR(31) || pixel.page_path || CHAR(31)
        || pixel.element_key || CHAR(31) || pixel.element_label || CHAR(31) || pixel.destination_path || CHAR(31)
        || pixel.click_target || CHAR(31) || STRFTIME('%Y-%m-%dT%H:%M:%S', pixel.occurred_at)
      FROM user_events AS pixel
      WHERE pixel.source IN ('shopify_pixel', 'shopify_pixel:tkf', 'shopify_pixel:tms', 'shopify_pixel:fkk');

      UPDATE user_events AS legacy
      SET is_shadowed = 1
      WHERE legacy.is_shadowed = 0
        AND legacy.event_name IN ('page_view', 'global_click')
        AND legacy.source IN ('shopify', 'shopify:tkf', 'shopify:tms', 'shopify:fkk')
        AND legacy.site_key || CHAR(31) || legacy.event_name || CHAR(31) || legacy.page_path || CHAR(31)
          || legacy.element_key || CHAR(31) || legacy.element_label || CHAR(31) || legacy.destination_path || CHAR(31)
          || legacy.click_target || CHAR(31) || STRFTIME('%Y-%m-%dT%H:%M:%S', legacy.occurred_at) IN (
            SELECT signature FROM shadow_pixel_signatures
        );
      DROP TABLE shadow_pixel_signatures;
    `);
    database.prepare("INSERT OR IGNORE INTO schema_migrations (key, applied_at) VALUES (?, ?)")
      .run(shadowMigrationKey, new Date().toISOString());
  }
  executeWithBusyRetry(database, `
    CREATE INDEX IF NOT EXISTS idx_menu_metrics_site_date ON menu_click_metrics(site_key, event_date);
    CREATE INDEX IF NOT EXISTS idx_site_metrics_site_date ON site_metrics(site_key, event_date, event_name);
    CREATE INDEX IF NOT EXISTS idx_global_click_metrics_site_date ON global_click_metrics(site_key, event_date, page_path);
    CREATE INDEX IF NOT EXISTS idx_user_events_site_time ON user_events(site_key, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_events_visible_site_time ON user_events(site_key, is_shadowed, occurred_at DESC);
  `);
  return database;
}

const globalDatabase = globalThis as GlobalWithDatabase;

export let db = globalDatabase.__multiSiteAnalyticsDatabase ?? createDatabase();

export function activateDatabasePath(databaseFilePath: string) {
  const resolvedPath = path.resolve(databaseFilePath);
  if (process.env.ANALYTICS_DATABASE_PATH === resolvedPath) return false;
  process.env.ANALYTICS_DATABASE_PATH = resolvedPath;
  const previous = db;
  db = createDatabase();
  globalDatabase.__multiSiteAnalyticsDatabase = db;
  const cleanup = setTimeout(() => {
    try {
      if (previous.open) previous.close();
    } catch (error) {
      console.warn("analytics_previous_database_close_failed", error instanceof Error ? error.message : String(error));
    }
  }, 60_000);
  cleanup.unref();
  return true;
}

if (process.env.NODE_ENV !== "production") {
  globalDatabase.__multiSiteAnalyticsDatabase = db;
}
