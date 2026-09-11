import { defaultSite, isSiteKey, type SiteKey } from "@/config/sites";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
export function resolveSite(params: SearchParams | URLSearchParams): SiteKey {
  const value = params instanceof URLSearchParams
    ? params.get("site")
    : firstValue(params.site);
  return isSiteKey(value) ? value : defaultSite;
}

export function siteRangeQuery(site: SiteKey, range: { startDate?: string; endDate?: string }) {
  const query = new URLSearchParams({ site });
  if (range.startDate) query.set("startDate", range.startDate);
  if (range.endDate) query.set("endDate", range.endDate);
  return query.toString();
}
