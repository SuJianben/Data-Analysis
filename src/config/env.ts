export const appConfig = {
  ga4PropertyId: process.env.GA4_PROPERTY_ID || "546810508",
  ga4AccessToken: process.env.GA4_ACCESS_TOKEN || "",
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
  googleOAuthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "",
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  clarityApiToken: process.env.CLARITY_API_TOKEN || "",
  userEventIngestKey: process.env.USER_EVENT_INGEST_KEY || "",
  userEventForwardUrl: process.env.USER_EVENT_FORWARD_URL || "",
  userEventForwardKey: process.env.USER_EVENT_FORWARD_KEY || "",
  userEventAllowedOrigins: (process.env.USER_EVENT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  userEventApiUrl: (process.env.USER_EVENT_API_URL || "").replace(/\/$/, ""),
  userEventReadKey: process.env.USER_EVENT_READ_KEY || "",
  importIngestKey: process.env.IMPORT_INGEST_KEY || "",
  aiBaseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
  aiApiKey: process.env.AI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "gpt-5-mini",
};
