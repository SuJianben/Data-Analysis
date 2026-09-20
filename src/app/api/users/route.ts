import { NextResponse } from "next/server";
import { loadUserSummaryReport } from "@/services/connectors/user-events";
import { resolveDateRange } from "@/features/date-range/date-range";
import { resolveSite } from "@/features/site-selection/site-selection";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageValue = Number(url.searchParams.get("page") || 1);
  const pageSizeValue = Number(url.searchParams.get("pageSize") || url.searchParams.get("limit") || 20);
  const page = Number.isFinite(pageValue) ? Math.max(Math.floor(pageValue), 1) : 1;
  const pageSize = Number.isFinite(pageSizeValue) ? Math.min(Math.max(Math.floor(pageSizeValue), 1), 100) : 20;
  const range = resolveDateRange(Object.fromEntries(url.searchParams.entries()));
  const site = resolveSite(url.searchParams);
  const report = await loadUserSummaryReport({ ...range, site, page, pageSize });
  return NextResponse.json({ ok: true, ...report });
}
