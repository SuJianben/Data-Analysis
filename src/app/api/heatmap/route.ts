import { NextResponse } from "next/server";
import { getHeatmapPagePaths, getHeatmapReportRows } from "@/services/database/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pagePath = url.searchParams.get("pagePath") || undefined;
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  return NextResponse.json({
    ok: true,
    paths: getHeatmapPagePaths(),
    rows: getHeatmapReportRows({ pagePath, startDate, endDate }),
  });
}
