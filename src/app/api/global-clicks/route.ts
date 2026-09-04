import { NextResponse } from "next/server";
import { getGlobalClickPagePaths, getGlobalClickReportRows } from "@/services/database/repositories";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.json({
    ok: true,
    paths: getGlobalClickPagePaths(),
    rows: getGlobalClickReportRows({
      pagePath: url.searchParams.get("pagePath") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
    }),
  });
}
