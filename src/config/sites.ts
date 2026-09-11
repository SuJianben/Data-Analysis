export const sites = {
  tkf: {
    key: "tkf",
    shortLabel: "TKF",
    label: "TurkForma",
    domain: "turkforma.com",
  },
  tms: {
    key: "tms",
    shortLabel: "TMS",
    label: "Top Mezek Store",
    domain: "mezkiraly.com",
  },
} as const;

export type SiteKey = keyof typeof sites;

export const siteList = Object.values(sites);
export const defaultSite: SiteKey = "tkf";

export function isSiteKey(value: unknown): value is SiteKey {
  return typeof value === "string" && value in sites;
}
