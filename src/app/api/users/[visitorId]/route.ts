import { NextResponse } from "next/server";
import { parseUserIdentityKey } from "@/features/users/identity";
import { loadUserEvents } from "@/services/connectors/user-events";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await context.params;
  const identity = parseUserIdentityKey(visitorId);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "用户标识无效。" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, identity, events: await loadUserEvents(identity.key) });
}
