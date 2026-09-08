import { NextResponse } from "next/server";
import { loadUserSummaries } from "@/services/connectors/user-events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limitValue = Number(new URL(request.url).searchParams.get("limit") || 200);
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(Math.floor(limitValue), 1), 500) : 200;
  return NextResponse.json({ ok: true, rows: await loadUserSummaries(limit) });
}
