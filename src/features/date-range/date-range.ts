import type { DateRangeOptions } from "@/types/analytics";

export type DateRange = Required<DateRangeOptions>;

export type DateRangeParams = Record<string, string | string[] | undefined>;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function currentShanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function defaultDateRange(now = new Date()): DateRange {
  const endDate = currentShanghaiDate(now);
  return { startDate: shiftIsoDate(endDate, -29), endDate };
}

export function resolveDateRange(
  params: DateRangeParams | { startDate?: unknown; endDate?: unknown },
  fallback = defaultDateRange(),
): DateRange {
  const rawStart = firstValue(params.startDate as string | string[] | undefined);
  const rawEnd = firstValue(params.endDate as string | string[] | undefined);
  const startDate = isIsoDate(rawStart) ? rawStart : fallback.startDate;
  const endDate = isIsoDate(rawEnd) ? rawEnd : fallback.endDate;
  return startDate <= endDate ? { startDate, endDate } : fallback;
}

export function dateRangeQuery(range: DateRange) {
  const query = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
  return query.toString();
}

export function datesInRange(range: DateRange) {
  const dates: string[] = [];
  let current = range.startDate;
  while (current <= range.endDate) {
    dates.push(current);
    current = shiftIsoDate(current, 1);
  }
  return dates;
}
