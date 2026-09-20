import "server-only";

import { appConfig } from "@/config/env";
import { CloudflareReadError } from "@/services/connectors/cloudflare-request";
import { ensureRuntimeSnapshotFresh } from "@/services/database/runtime-snapshot";

type FallbackReadOptions<T> = {
  label: string;
  cloudflare: () => Promise<T>;
  local: () => T | Promise<T>;
};

export function isCloudflareTemporarilyUnavailable(error: unknown) {
  return error instanceof CloudflareReadError && error.retryable;
}

export async function readWithLocalFallback<T>({ label, cloudflare, local }: FallbackReadOptions<T>): Promise<T> {
  if (appConfig.analyticsReadMode === "local" || !appConfig.userEventApiUrl) {
    await ensureRuntimeSnapshotFresh();
    return local();
  }

  try {
    return await cloudflare();
  } catch (error) {
    if (!isCloudflareTemporarilyUnavailable(error)) throw error;
    const message = error instanceof Error ? error.message : "Cloudflare 数据源暂时不可用";
    console.warn(`[数据源降级] ${label}：${message}，已切换到本地数据库。`);
    await ensureRuntimeSnapshotFresh();
    return local();
  }
}
