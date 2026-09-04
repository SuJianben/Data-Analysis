import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DEPLOY_SNAPSHOT_PATH = path.join(DATA_DIRECTORY, "analytics-deploy.db");
const RUNTIME_DATA_DIRECTORY = path.join("/tmp", "tkf-signal");

function databasePath() {
  if (!process.env.VERCEL) return path.join(DATA_DIRECTORY, "analytics.db");

  mkdirSync(RUNTIME_DATA_DIRECTORY, { recursive: true });
  const runtimePath = path.join(RUNTIME_DATA_DIRECTORY, "analytics.db");
  if (!existsSync(runtimePath) && existsSync(DEPLOY_SNAPSHOT_PATH)) {
    copyFileSync(DEPLOY_SNAPSHOT_PATH, runtimePath);
  }
  return runtimePath;
}

type GlobalWithDatabase = typeof globalThis & {
  __tkfSignalDatabase?: Database.Database;
};

function createDatabase() {
  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const database = new Database(databasePath());
  database.pragma("busy_timeout = 5000");
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
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
  return database;
}

const globalDatabase = globalThis as GlobalWithDatabase;

export const db = globalDatabase.__tkfSignalDatabase ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalDatabase.__tkfSignalDatabase = db;
}
