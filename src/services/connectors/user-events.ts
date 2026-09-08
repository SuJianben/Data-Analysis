import "server-only";

import { appConfig } from "@/config/env";
import {
  getUserEvents as getLocalUserEvents,
  getUserSummaries as getLocalUserSummaries,
} from "@/services/database/user-event-repository";
import type { DateRangeOptions, UserEventRow, UserSummaryRow } from "@/types/analytics";

type UserSummaryResponse = { ok: boolean; rows?: UserSummaryRow[]; error?: string };
type UserDetailResponse = { ok: boolean; events?: UserEventRow[]; error?: string };

async function remoteRequest<T extends { ok: boolean; error?: string }>(path: string): Promise<T> {
  if (!appConfig.userEventApiUrl || !appConfig.userEventReadKey) {
    throw new Error("远程用户事件数据源配置不完整。");
  }
  const response = await fetch(`${appConfig.userEventApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${appConfig.userEventReadKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json() as T;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `读取用户事件失败（HTTP ${response.status}）。`);
  }
  return payload;
}

function rangeQuery(options: DateRangeOptions) {
  const query = new URLSearchParams();
  if (options.startDate) query.set("startDate", options.startDate);
  if (options.endDate) query.set("endDate", options.endDate);
  return query;
}

export async function loadUserSummaries(limit = 200, options: DateRangeOptions = {}): Promise<UserSummaryRow[]> {
  if (!appConfig.userEventApiUrl) return getLocalUserSummaries(limit, options);
  const query = rangeQuery(options);
  query.set("limit", String(limit));
  const payload = await remoteRequest<UserSummaryResponse>(`/users?${query.toString()}`);
  return payload.rows || [];
}

export async function loadUserEvents(identityKey: string, limit = 500, options: DateRangeOptions = {}): Promise<UserEventRow[]> {
  if (!appConfig.userEventApiUrl) return getLocalUserEvents(identityKey, limit, options);
  const query = rangeQuery(options);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await remoteRequest<UserDetailResponse>(`/users/${encodeURIComponent(identityKey)}${suffix}`);
  return (payload.events || []).slice(0, limit);
}
