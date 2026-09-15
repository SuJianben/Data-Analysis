import type { UserEventInput, UserEventPayload } from "./types";

export type TrafficFilterReason = "automated_user_agent" | "generated_collection_filter" | "unstable_page_identity";

const AUTOMATED_USER_AGENT = /(?:bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|phantomjs|lighthouse|pagespeed|pingdom|uptimerobot|python-requests|scrapy|curl\/|wget\/|go-http-client)/i;
const GENERATED_FILTER_SEGMENT = /(?:^|\/|\+)blk-(?:combo|team)--/i;

export function isAutomatedUserAgent(userAgent: string) {
  return Boolean(userAgent && AUTOMATED_USER_AGENT.test(userAgent));
}

export function isGeneratedCollectionFilterPath(pagePath: string) {
  const normalized = String(pagePath || "").split("?", 1)[0];
  return normalized.toLowerCase().includes("/collections/") && GENERATED_FILTER_SEGMENT.test(normalized);
}

function filterReason(request: Request, payload: UserEventPayload, event: UserEventInput): TrafficFilterReason | null {
  if (payload.siteKey !== "blk" || payload.source !== "shopline_pixel:blk" || event.eventName !== "page_view") {
    return null;
  }
  if (isAutomatedUserAgent(request.headers.get("user-agent") || "")) return "automated_user_agent";
  if (isGeneratedCollectionFilterPath(event.pagePath || "/")) return "generated_collection_filter";
  if (event.metadata?.identitySource === "shopline_event_fallback") return "unstable_page_identity";
  return null;
}

export function filterEventsBeforeWrite(request: Request, payload: UserEventPayload) {
  const events: UserEventInput[] = [];
  const reasons: Partial<Record<TrafficFilterReason, number>> = {};
  for (const event of payload.events) {
    const reason = filterReason(request, payload, event);
    if (!reason) {
      events.push(event);
      continue;
    }
    reasons[reason] = (reasons[reason] || 0) + 1;
  }
  return { events, filtered: payload.events.length - events.length, reasons };
}
