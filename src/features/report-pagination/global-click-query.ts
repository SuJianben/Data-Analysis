import type { DateRangeParams } from "@/features/date-range/date-range";
import type { GlobalClickReportQuery } from "@/types/analytics";

export const GLOBAL_CLICK_PAGE_SIZE = 20;

const DEVICE_FILTERS = new Set(["all", "desktop", "mobile", "tablet"]);

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveGlobalClickQuery(params: DateRangeParams): Pick<GlobalClickReportQuery, "query" | "device" | "page" | "pageSize"> {
  const query = (firstValue(params.query) || "").trim().slice(0, 120);
  const requestedDevice = firstValue(params.device) || "all";
  return {
    query,
    device: DEVICE_FILTERS.has(requestedDevice) ? requestedDevice : "all",
    page: positiveInteger(firstValue(params.tablePage), 1),
    pageSize: GLOBAL_CLICK_PAGE_SIZE,
  };
}
