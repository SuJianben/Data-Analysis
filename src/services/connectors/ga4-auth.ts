import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { appConfig } from "@/config/env";
import type { Ga4CredentialMode } from "@/types/analytics";

function serviceAccountPath() {
  if (!appConfig.googleApplicationCredentials) return "";
  const credentialsFile = path.basename(appConfig.googleApplicationCredentials);
  return path.join(process.cwd(), "secrets", credentialsFile);
}

function hasCompleteOAuthCredentials() {
  return Boolean(
    appConfig.googleOAuthClientId &&
      appConfig.googleOAuthClientSecret &&
      appConfig.googleOAuthRefreshToken,
  );
}

function hasPartialOAuthCredentials() {
  return Boolean(
    appConfig.googleOAuthClientId ||
      appConfig.googleOAuthClientSecret ||
      appConfig.googleOAuthRefreshToken,
  );
}

async function accessTokenFromOAuth() {
  const client = new OAuth2Client({
    clientId: appConfig.googleOAuthClientId,
    clientSecret: appConfig.googleOAuthClientSecret,
  });
  client.setCredentials({ refresh_token: appConfig.googleOAuthRefreshToken });

  try {
    const credential = await client.getAccessToken();
    const token = typeof credential === "string" ? credential : credential.token;
    if (token) return token;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    if (detail.includes("invalid_grant")) {
      throw new Error("GA4 OAuth Refresh Token 已失效，请重新授权后更新本机配置。");
    }
    throw new Error("GA4 OAuth 无法刷新 Access Token，请检查客户端凭据与 Refresh Token。");
  }

  throw new Error("GA4 OAuth 未返回可用的 Access Token。");
}

async function accessTokenFromServiceAccount(keyFilename: string) {
  const auth = new GoogleAuth({
    keyFilename,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const client = await auth.getClient();
  const credential = await client.getAccessToken();
  const token = typeof credential === "string" ? credential : credential.token;
  if (token) return token;
  throw new Error("Google 服务账号未能生成 Access Token。");
}

export function getGa4CredentialMode(): Ga4CredentialMode {
  if (hasCompleteOAuthCredentials()) return "oauth";

  const keyFilename = serviceAccountPath();
  if (keyFilename && existsSync(keyFilename)) return "service_account";
  if (appConfig.ga4AccessToken) return "access_token";
  return "none";
}

export async function resolveGa4AccessToken(temporaryToken?: string) {
  if (temporaryToken) return temporaryToken;
  if (hasCompleteOAuthCredentials()) return accessTokenFromOAuth();

  const keyFilename = serviceAccountPath();
  if (keyFilename && existsSync(keyFilename)) {
    return accessTokenFromServiceAccount(keyFilename);
  }

  if (appConfig.ga4AccessToken) return appConfig.ga4AccessToken;
  if (hasPartialOAuthCredentials()) {
    throw new Error(
      "GA4 OAuth 配置不完整，请检查 Client ID、Client Secret 和 Refresh Token。",
    );
  }

  throw new Error("GA4 尚未固定凭证。请配置 OAuth Refresh Token，或临时输入 Access Token。");
}
