import { NextResponse } from "next/server";
import { parseUserIdentityKey } from "@/features/users/identity";
import { loadUserEvents } from "@/services/connectors/user-events";
import { resolveDateRange } from "@/features/date-range/date-range";
import { resolveSite } from "@/features/site-selection/site-selection";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await context.params;
  const identity = parseUserIdentityKey(visitorId);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "用户标识无效。" }, { status: 400 });
  }
  const url = new URL(request.url);
  const range = resolveDateRange(Object.fromEntries(url.searchParams.entries()));
  const site = resolveSite(url.searchParams);
  return NextResponse.json({ ok: true, identity, events: await loadUserEvents(identity.key, 500, { ...range, site }) });
}
