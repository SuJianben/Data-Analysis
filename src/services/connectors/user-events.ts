import "server-only";

import { cloudflareRead } from "@/services/connectors/cloudflare-request";
import { readWithLocalFallback } from "@/services/connectors/data-source-fallback";
import {
  getUserEvents as getLocalUserEvents,
  getUserSummaries as getLocalUserSummaries,
  getUserTrend as getLocalUserTrend,
  getUserDeviceBreakdown as getLocalUserDeviceBreakdown,
  hasLocalUserEvents,
} from "@/services/database/user-event-repository";
import type { DateRangeOptions, DeviceStatPoint, UserEventRow, UserSummaryRow, UserTrendPoint } from "@/types/analytics";

type UserSummaryResponse = { ok: boolean; rows?: UserSummaryRow[]; error?: string };
type UserDetailResponse = { ok: boolean; events?: UserEventRow[]; error?: string };
type UserTrendResponse = { ok: boolean; trend?: UserTrendPoint[]; error?: string };
type UserDeviceResponse = { ok: boolean; devices?: DeviceStatPoint[]; error?: string };

function rangeQuery(options: DateRangeOptions) {
  const query = new URLSearchParams();
  if (options.site) query.set("site", options.site);
  if (options.startDate) query.set("startDate", options.startDate);
  if (options.endDate) query.set("endDate", options.endDate);
  return query;
}

function requireLocalUserEvents<T>(read: () => T) {
  if (!hasLocalUserEvents()) {
    throw new Error("云端用户行为暂时不可用，本地尚无可用的用户行为快照。");
  }
  return read();
}

export async function loadUserSummaries(limit = 200, options: DateRangeOptions = {}): Promise<UserSummaryRow[]> {
  return readWithLocalFallback({
    label: "用户摘要",
    local: () => requireLocalUserEvents(() => getLocalUserSummaries(limit, options)),
    cloudflare: async () => {
      const query = rangeQuery(options);
      query.set("limit", String(limit));
      const payload = await cloudflareRead<UserSummaryResponse>(`/users?${query.toString()}`, { errorLabel: "用户摘要读取" });
      return payload.rows || [];
    },
  });
}

export async function loadUserEvents(identityKey: string, limit = 500, options: DateRangeOptions = {}): Promise<UserEventRow[]> {
  return readWithLocalFallback({
    label: "用户行为",
    local: () => requireLocalUserEvents(() => getLocalUserEvents(identityKey, limit, options)),
    cloudflare: async () => {
      const query = rangeQuery(options);
      const suffix = query.size ? `?${query.toString()}` : "";
      const payload = await cloudflareRead<UserDetailResponse>(`/users/${encodeURIComponent(identityKey)}${suffix}`, { errorLabel: "用户行为读取" });
      return (payload.events || []).slice(0, limit);
    },
  });
}

export async function loadUserTrend(options: DateRangeOptions = {}): Promise<UserTrendPoint[]> {
  return readWithLocalFallback({
    label: "用户趋势",
    local: () => requireLocalUserEvents(() => getLocalUserTrend(options)),
    cloudflare: async () => {
      const query = rangeQuery(options);
      const suffix = query.size ? `?${query.toString()}` : "";
      const payload = await cloudflareRead<UserTrendResponse>(`/users/trend${suffix}`, { errorLabel: "用户趋势读取" });
      return payload.trend || [];
    },
  });
}

export async function loadUserDeviceBreakdown(options: DateRangeOptions = {}): Promise<DeviceStatPoint[]> {
  return readWithLocalFallback({
    label: "用户设备分布",
    local: () => requireLocalUserEvents(() => getLocalUserDeviceBreakdown(options)),
    cloudflare: async () => {
      const query = rangeQuery(options);
      const suffix = query.size ? `?${query.toString()}` : "";
      const payload = await cloudflareRead<UserDeviceResponse>(`/users/device-breakdown${suffix}`, { errorLabel: "用户设备读取" });
      return payload.devices || [];
    },
  });
}
