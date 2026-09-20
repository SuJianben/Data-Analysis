import "server-only";

import { appConfig } from "@/config/env";

export type CloudflareEnvelope = { ok: boolean; error?: string };

export class CloudflareReadError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, options: { status?: number | null; retryable?: boolean; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "CloudflareReadError";
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
  }
}

type CloudflareReadOptions = {
  errorLabel: string;
  fresh?: boolean;
};

const REPORT_CACHE_SECONDS = 30;

function isRetryableCloudflareFailure(status: number, message: string) {
  return status === 429
    || status >= 500
    || /exceeded D1's free tier daily row (?:read|write) limit|D1.*daily row (?:read|write) limit/i.test(message);
}

export async function cloudflareRead<T extends CloudflareEnvelope>(
  path: string,
  { errorLabel, fresh = false }: CloudflareReadOptions,
): Promise<T> {
  if (!appConfig.userEventApiUrl || !appConfig.userEventReadKey) {
    throw new CloudflareReadError("Cloudflare 数据源配置不完整。");
  }

  let response: Response;
  try {
    response = await fetch(`${appConfig.userEventApiUrl}${path}`, {
      headers: { Authorization: `Bearer ${appConfig.userEventReadKey}` },
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: REPORT_CACHE_SECONDS } }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    throw new CloudflareReadError(`${errorLabel}暂时无法连接 Cloudflare。`, {
      retryable: true,
      cause: error,
    });
  }
  const text = await response.text();
  let payload: T;
  try {
    payload = JSON.parse(text) as T;
  } catch (error) {
    const message = `${errorLabel}接口返回了非 JSON 内容（HTTP ${response.status}）。`;
    throw new CloudflareReadError(message, {
      status: response.status,
      retryable: isRetryableCloudflareFailure(response.status, message),
      cause: error,
    });
  }
  if (!response.ok || !payload.ok) {
    const message = payload.error || `${errorLabel}失败（HTTP ${response.status}）。`;
    throw new CloudflareReadError(message, {
      status: response.status,
      retryable: isRetryableCloudflareFailure(response.status, message),
    });
  }
  return payload;
}
