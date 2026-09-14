export const siteKeys = ["tkf", "tms", "fkk"] as const;

export type SiteKey = (typeof siteKeys)[number];

const serviceSites: Record<string, SiteKey> = {
  "tkf-signal-user-events": "tkf",
  "tms-signal-user-events": "tms",
  "fkk-signal-user-events": "fkk",
};

const storefrontOrigins: Record<SiteKey, readonly string[]> = {
  tkf: ["https://turkforma.com", "https://www.turkforma.com"],
  tms: ["https://mezkiraly.com", "https://www.mezkiraly.com"],
  fkk: ["https://footballkituk.com", "https://www.footballkituk.com"],
};

export function isSiteKey(value: unknown): value is SiteKey {
  return typeof value === "string" && siteKeys.some((siteKey) => siteKey === value);
}

export function browserPayloadMatchesSite(serviceName: string, origin: string | null, siteKey: SiteKey) {
  return serviceSites[serviceName] === siteKey && Boolean(origin && storefrontOrigins[siteKey].includes(origin));
}
