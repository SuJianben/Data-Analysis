import "server-only";

import { appConfig } from "@/config/env";
import { cloudflareRead } from "@/services/connectors/cloudflare-request";
import {
  getUserEvents as getLocalUserEvents,
  getUserSummaries as getLocalUserSummaries,
  getUserTrend as getLocalUserTrend,
  getUserDeviceBreakdown as getLocalUserDeviceBreakdown,
} from "@/services/database/user-event-repository";
import type { DateRangeOptions, DeviceStatPoint, UserEventRow, UserSummaryRow, UserTrendPoint } from "@/types/analytics";

type UserSummaryResponse = { ok: boolean; rows?: UserSummaryRow[]; error?: string };
type UserDetailResponse = { ok: boolean; events?: UserEventRow[]; error?: string };
type UserTrendResponse = { ok: boolean; trend?: UserTrendPoint[]; error?: string };
type UserDeviceResponse = { ok: boolean; devices?: DeviceStatPoint[]; error?: string };

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
  const payload = await cloudflareRead<UserSummaryResponse>(`/users?${query.toString()}`, { errorLabel: "用户摘要读取" });
  return payload.rows || [];
}

export async function loadUserEvents(identityKey: string, limit = 500, options: DateRangeOptions = {}): Promise<UserEventRow[]> {
  if (!appConfig.userEventApiUrl) return getLocalUserEvents(identityKey, limit, options);
  const query = rangeQuery(options);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await cloudflareRead<UserDetailResponse>(`/users/${encodeURIComponent(identityKey)}${suffix}`, { errorLabel: "用户行为读取" });
  return (payload.events || []).slice(0, limit);
}

export async function loadUserTrend(options: DateRangeOptions = {}): Promise<UserTrendPoint[]> {
  if (!appConfig.userEventApiUrl) return getLocalUserTrend(options);
  const query = rangeQuery(options);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await cloudflareRead<UserTrendResponse>(`/users/trend${suffix}`, { errorLabel: "用户趋势读取" });
  return payload.trend || [];
}

export async function loadUserDeviceBreakdown(options: DateRangeOptions = {}): Promise<DeviceStatPoint[]> {
  if (!appConfig.userEventApiUrl) return getLocalUserDeviceBreakdown(options);
  const query = rangeQuery(options);
  const suffix = query.size ? `?${query.toString()}` : "";
  const payload = await cloudflareRead<UserDeviceResponse>(`/users/device-breakdown${suffix}`, { errorLabel: "用户设备读取" });
  return payload.devices || [];
}
