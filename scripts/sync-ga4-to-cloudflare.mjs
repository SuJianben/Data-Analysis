#!/usr/bin/env node

console.warn("[兼容提示] Cloudflare 同步命令已迁移为本地主库同步，不再上传 D1。");
await import("./sync-ga4-to-local.mjs");
