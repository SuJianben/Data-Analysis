const AUTOMATED_USER_AGENT = /(?:bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|phantomjs|lighthouse|pagespeed|pingdom|uptimerobot|python-requests|scrapy|curl\/|wget\/|go-http-client)/i;
const GENERATED_FILTER_SEGMENT = /(?:^|\/|\+)blk-(?:combo|team)--/i;

export function isAutomatedUserAgent(userAgent: string) {
  return Boolean(userAgent && AUTOMATED_USER_AGENT.test(userAgent));
}

export function isGeneratedCollectionFilterPath(pagePath: string) {
  const normalized = String(pagePath || "").split("?", 1)[0];
  return normalized.toLowerCase().includes("/collections/") && GENERATED_FILTER_SEGMENT.test(normalized);
}
