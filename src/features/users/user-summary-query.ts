import type { DateRangeParams } from "@/features/date-range/date-range";
import type { UserSummaryQuery } from "@/types/analytics";

export const USER_SUMMARY_PAGE_SIZE = 20;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveUserSummaryQuery(params: DateRangeParams): Pick<UserSummaryQuery, "page" | "pageSize"> {
  return {
    page: positiveInteger(firstValue(params.tablePage), 1),
    pageSize: USER_SUMMARY_PAGE_SIZE,
  };
}
