#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { OAuth2Client } from "google-auth-library";

const DIMENSIONS = [
  ["menu_name", "Menu name"],
  ["menu_key", "Menu key"],
  ["parent_menu_name", "Parent menu name"],
  ["menu_level", "Menu level"],
  ["menu_action", "Menu action"],
  ["click_target", "Click target"],
  ["element_key", "Element key"],
  ["element_label", "Element label"],
  ["page_section", "Page section"],
  ["destination_path", "Destination path"],
  ["heatmap_cell", "Heatmap cell"],
  ["element_group", "Element group"],
];

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().replace(/^export\s+/, "");
    if (process.env[key]) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

async function apiRequest(accessToken, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Analytics Admin API 返回了非 JSON 响应（HTTP ${response.status}）`);
  }
  if (!response.ok) {
    const message = payload?.error?.message || `Analytics Admin API 请求失败（HTTP ${response.status}）`;
    throw new Error(message);
  }
  return payload;
}

async function main() {
  loadLocalEnv();
  const siteKey = (option("--site") || "blk").trim().toLowerCase();
  const propertyId = option("--property-id") || process.env[`${siteKey.toUpperCase()}_GA4_PROPERTY_ID`]?.trim();
  if (!propertyId || !/^\d+$/.test(propertyId)) throw new Error("缺少有效的 GA4 媒体资源 ID");

  const oauth = new OAuth2Client(
    requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
  );
  oauth.setCredentials({ refresh_token: requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN") });
  const tokenResult = await oauth.getAccessToken();
  const accessToken = typeof tokenResult === "string" ? tokenResult : tokenResult?.token;
  if (!accessToken) throw new Error("无法取得 Google OAuth 访问令牌");

  const parent = `properties/${propertyId}`;
  const endpoint = `https://analyticsadmin.googleapis.com/v1beta/${parent}/customDimensions`;
  const listed = await apiRequest(accessToken, `${endpoint}?pageSize=200`);
  const existing = new Set((listed.customDimensions || []).map((item) => item.parameterName));
  const missing = DIMENSIONS.filter(([parameterName]) => !existing.has(parameterName));

  console.log(`[GA4] ${siteKey.toUpperCase()} 已有 ${existing.size} 个自定义维度，本项目缺少 ${missing.length} 个。`);
  if (!missing.length) return;
  if (!process.argv.includes("--apply")) {
    console.log(`[预览] ${missing.map(([parameterName]) => parameterName).join("、")}`);
    console.log("增加 --apply 后才会创建，当前没有修改 GA4。");
    return;
  }

  for (const [parameterName, displayName] of missing) {
    await apiRequest(accessToken, endpoint, {
      method: "POST",
      body: JSON.stringify({
        parameterName,
        displayName,
        description: `Signal dashboard event parameter: ${parameterName}`,
        scope: "EVENT",
      }),
    });
    console.log(`[创建] ${parameterName}`);
  }
  console.log(`[完成] 已为 ${siteKey.toUpperCase()} 补齐 ${missing.length} 个事件级自定义维度。`);
}

main().catch((error) => {
  console.error(`[失败] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
