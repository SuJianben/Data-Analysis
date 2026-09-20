import type { SiteKey } from "@/config/sites";
import type { UserEventInput } from "@/types/analytics";

type UserEventPayload = { siteKey: SiteKey; source: string; events: UserEventInput[] };

const AUTOMATED_USER_AGENT = /(?:bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|phantomjs|lighthouse|pagespeed|pingdom|uptimerobot|python-requests|scrapy|curl\/|wget\/|go-http-client)/i;
const GENERATED_FILTER_SEGMENT = /(?:^|\/|\+)blk-(?:combo|team)--/i;
const LOW_VALUE_EVENTS = new Set(["page_view", "global_click"]);
const UNSTABLE_IDENTITIES = new Set(["shopify_event_fallback", "shopline_event_fallback"]);
const DEDUPE_WINDOWS_SECONDS: Record<string, number> = { page_view: 300, global_click: 5 };

function stableHash(value: string) {
  let hash = 14_695_981_039_346_656_037n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1_099_511_628_211n);
  }
  return hash.toString(16).padStart(16, "0");
}

function normalize(payload: UserEventPayload, event: UserEventInput) {
  const seconds = DEDUPE_WINDOWS_SECONDS[event.eventName];
  if (!seconds) return event;
  const bucket = Math.floor(Date.parse(event.occurredAt) / (seconds * 1_000));
  const signature = [payload.siteKey, payload.source, event.visitorId, event.eventName, event.pagePath || "/", event.elementKey || "", event.elementLabel || "", event.destinationPath || "", event.clickTarget || "", bucket].join("|");
  return {
    ...event,
    eventId: `write_policy_${event.eventName}_${stableHash(signature)}_${bucket.toString(36)}`,
    metadata: { ...(event.metadata || {}), dedupeWindowSeconds: seconds, writePolicyVersion: "2026-09-17.local-primary-v1" },
  };
}

export function applyEventWritePolicy(request: Request, payload: UserEventPayload) {
  const events: UserEventInput[] = [];
  const reasons: Record<string, number> = {};
  let optimized = 0;
  for (const event of payload.events) {
    let reason = "";
    if (LOW_VALUE_EVENTS.has(event.eventName) && AUTOMATED_USER_AGENT.test(request.headers.get("user-agent") || "")) reason = "automated_user_agent";
    if (!reason && payload.siteKey === "blk" && event.eventName === "page_view" && String(event.pagePath || "").toLowerCase().includes("/collections/") && GENERATED_FILTER_SEGMENT.test(event.pagePath || "")) reason = "generated_collection_filter";
    if (!reason && LOW_VALUE_EVENTS.has(event.eventName) && UNSTABLE_IDENTITIES.has(String(event.metadata?.identitySource || ""))) reason = "unstable_page_identity";
    if (reason) {
      reasons[reason] = (reasons[reason] || 0) + 1;
      continue;
    }
    const normalized = normalize(payload, event);
    if (normalized !== event) optimized += 1;
    events.push(normalized);
  }
  return { events, filtered: payload.events.length - events.length, optimized, reasons };
}
