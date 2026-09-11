import "server-only";

import { appConfig } from "@/config/env";

export type CloudflareEnvelope = { ok: boolean; error?: string };

type CloudflareReadOptions = {
  errorLabel: string;
  fresh?: boolean;
};

const REPORT_CACHE_SECONDS = 30;

export async function cloudflareRead<T extends CloudflareEnvelope>(
  path: string,
  { errorLabel, fresh = false }: CloudflareReadOptions,
): Promise<T> {
  if (!appConfig.userEventApiUrl || !appConfig.userEventReadKey) {
    throw new Error("Cloudflare 数据源配置不完整。");
  }

  const response = await fetch(`${appConfig.userEventApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${appConfig.userEventReadKey}` },
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: REPORT_CACHE_SECONDS } }),
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let payload: T;
  try {
    payload = JSON.parse(text) as T;
  } catch {
    throw new Error(`${errorLabel}接口返回了非 JSON 内容（HTTP ${response.status}）。`);
  }
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `${errorLabel}失败（HTTP ${response.status}）。`);
  }
  return payload;
}
