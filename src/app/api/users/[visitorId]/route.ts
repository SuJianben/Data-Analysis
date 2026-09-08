import { NextResponse } from "next/server";
import { parseUserIdentityKey } from "@/features/users/identity";
import { loadUserEvents } from "@/services/connectors/user-events";
import { resolveDateRange } from "@/features/date-range/date-range";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await context.params;
  const identity = parseUserIdentityKey(visitorId);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "用户标识无效。" }, { status: 400 });
  }
  const range = resolveDateRange(Object.fromEntries(new URL(request.url).searchParams.entries()));
  return NextResponse.json({ ok: true, identity, events: await loadUserEvents(identity.key, 500, range) });
}
