import { NextResponse } from "next/server";
import { loadUserSummaries } from "@/services/connectors/user-events";
import { resolveDateRange } from "@/features/date-range/date-range";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get("limit") || 200);
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(Math.floor(limitValue), 1), 500) : 200;
  const range = resolveDateRange(Object.fromEntries(url.searchParams.entries()));
  return NextResponse.json({ ok: true, rows: await loadUserSummaries(limit, range) });
}
