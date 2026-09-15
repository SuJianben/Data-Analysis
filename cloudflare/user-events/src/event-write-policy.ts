import type { UserEventInput, UserEventPayload } from "./types";
import { isAutomatedUserAgent, isGeneratedCollectionFilterPath } from "./traffic-filter.ts";

export type EventWriteFilterReason =
  | "automated_user_agent"
  | "generated_collection_filter"
  | "unstable_page_identity";

const LOW_VALUE_EVENTS = new Set(["page_view", "global_click"]);
const UNSTABLE_IDENTITY_SOURCES = new Set(["shopify_event_fallback", "shopline_event_fallback"]);

function filterReason(
  request: Request,
  payload: UserEventPayload,
  event: UserEventInput,
): EventWriteFilterReason | null {
  if (!LOW_VALUE_EVENTS.has(event.eventName)) return null;
  if (isAutomatedUserAgent(request.headers.get("user-agent") || "")) return "automated_user_agent";
  if (
    payload.siteKey === "blk" &&
    payload.source === "shopline_pixel:blk" &&
    event.eventName === "page_view" &&
    isGeneratedCollectionFilterPath(event.pagePath || "/")
  ) {
    return "generated_collection_filter";
  }
  if (UNSTABLE_IDENTITY_SOURCES.has(String(event.metadata?.identitySource || ""))) {
    return "unstable_page_identity";
  }
  return null;
}

export function applyEventWritePolicy(request: Request, payload: UserEventPayload) {
  const events: UserEventInput[] = [];
  const reasons: Partial<Record<EventWriteFilterReason, number>> = {};
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
