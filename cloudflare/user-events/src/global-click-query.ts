import type { DateRangeOptions } from "./date-range";

export type GlobalClickQuery = DateRangeOptions & {
  pagePath?: string;
  query?: string;
  device?: string;
  page: number;
  pageSize: number;
};

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export function parseGlobalClickQuery(url: URL, range: DateRangeOptions): GlobalClickQuery {
  return {
    ...range,
    pagePath: url.searchParams.get("pagePath")?.trim().slice(0, 2_000) || undefined,
    query: url.searchParams.get("query")?.trim().slice(0, 120) || undefined,
    device: url.searchParams.get("device")?.trim().slice(0, 40) || "all",
    page: positiveInteger(url.searchParams.get("page"), 1, 100_000),
    pageSize: positiveInteger(url.searchParams.get("pageSize"), 20, 100),
  };
}
