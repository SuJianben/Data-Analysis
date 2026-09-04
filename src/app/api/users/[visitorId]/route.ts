import { NextResponse } from "next/server";
import { getUserEvents } from "@/services/database/repositories";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await context.params;
  if (!visitorId || visitorId.length > 160) {
    return NextResponse.json({ ok: false, error: "用户标识无效。" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, visitorId, events: getUserEvents(visitorId) });
}
