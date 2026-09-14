export const sites = {
  tkf: {
    key: "tkf",
    shortLabel: "TKF",
    label: "TurkForma",
    domain: "turkforma.com",
    platform: "shopify",
  },
  tms: {
    key: "tms",
    shortLabel: "TMS",
    label: "Top Mezek Store",
    domain: "mezkiraly.com",
    platform: "shopify",
  },
  fkk: {
    key: "fkk",
    shortLabel: "FKK",
    label: "Football Kit UK",
    domain: "footballkituk.com",
    platform: "shopify",
  },
  blk: {
    key: "blk",
    shortLabel: "BLK",
    label: "Belgiumkits",
    domain: "belgiumkits.com",
    platform: "shopline",
  },
} as const;

export type SiteKey = keyof typeof sites;

export const siteKeys = Object.keys(sites) as [SiteKey, ...SiteKey[]];
export const siteList = Object.values(sites);
export const defaultSite: SiteKey = "tkf";

export function isSiteKey(value: unknown): value is SiteKey {
  return typeof value === "string" && value in sites;
}
