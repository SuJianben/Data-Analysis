export type DateRangeOptions = {
  startDate?: string;
  endDate?: string;
  site?: "tkf" | "tms";
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseDateRange(url: URL): DateRangeOptions {
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  if (startDate && !isIsoDate(startDate)) throw new Error("开始日期格式不正确。");
  if (endDate && !isIsoDate(endDate)) throw new Error("结束日期格式不正确。");
  if (startDate && endDate && startDate > endDate) throw new Error("开始日期不能晚于结束日期。");
  const rawSite = url.searchParams.get("site") || "tkf";
  if (rawSite !== "tkf" && rawSite !== "tms") throw new Error("站点参数不正确。");
  return { startDate, endDate, site: rawSite };
}

export function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
