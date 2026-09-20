import type { UserEventInput, UserEventPayload } from "./types";
import { isAutomatedUserAgent, isGeneratedCollectionFilterPath } from "./traffic-filter.ts";

export type EventWriteFilterReason =
  | "automated_user_agent"
  | "generated_collection_filter"
  | "unstable_page_identity";

const LOW_VALUE_EVENTS = new Set(["page_view", "global_click"]);
const UNSTABLE_IDENTITY_SOURCES = new Set(["shopify_event_fallback", "shopline_event_fallback"]);
const DEDUPE_WINDOWS_SECONDS: Record<string, number> = {
  page_view: 300,
  global_click: 5,
};

function stableHash(value: string) {
  let hash = 14_695_981_039_346_656_037n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1_099_511_628_211n);
  }
  return hash.toString(16).padStart(16, "0");
}

function normalizeLowValueEvent(payload: UserEventPayload, event: UserEventInput) {
  const windowSeconds = DEDUPE_WINDOWS_SECONDS[event.eventName];
  if (!windowSeconds) return event;
  const occurredAt = Date.parse(event.occurredAt);
  const bucket = Math.floor(occurredAt / (windowSeconds * 1_000));
  const signature = [
    payload.siteKey,
    payload.source,
    event.visitorId,
    event.eventName,
    event.pagePath || "/",
    event.elementKey || "",
    event.elementLabel || "",
    event.destinationPath || "",
    event.clickTarget || "",
    bucket,
  ].join("|");
  return {
    ...event,
    eventId: `write_policy_${event.eventName}_${stableHash(signature)}_${bucket.toString(36)}`,
    metadata: {
      ...(event.metadata || {}),
      dedupeWindowSeconds: windowSeconds,
      writePolicyVersion: "2026-09-16.v2",
    },
  };
}

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
  let optimized = 0;
  for (const event of payload.events) {
    const reason = filterReason(request, payload, event);
    if (!reason) {
      const normalized = normalizeLowValueEvent(payload, event);
      if (normalized !== event) optimized += 1;
      events.push(normalized);
      continue;
    }
    reasons[reason] = (reasons[reason] || 0) + 1;
  }
  return { events, filtered: payload.events.length - events.length, reasons, optimized };
}
