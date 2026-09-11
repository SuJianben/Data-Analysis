import { NextResponse } from "next/server";
import { loadGlobalClickReport } from "@/services/connectors/analytics";
import { resolveDateRange } from "@/features/date-range/date-range";
import { resolveSite } from "@/features/site-selection/site-selection";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = resolveDateRange(Object.fromEntries(url.searchParams.entries()));
  const site = resolveSite(url.searchParams);
  const report = await loadGlobalClickReport({
    pagePath: url.searchParams.get("pagePath") || undefined,
    query: url.searchParams.get("query") || undefined,
    device: url.searchParams.get("device") || undefined,
    page: Number(url.searchParams.get("page") || 1),
    pageSize: Number(url.searchParams.get("pageSize") || 20),
    ...range,
    site,
  });
  return NextResponse.json({
    ok: true,
    ...report,
  });
}
