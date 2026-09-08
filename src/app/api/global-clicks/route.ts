import { NextResponse } from "next/server";
import { loadGlobalClickReport } from "@/services/connectors/analytics";
import { resolveDateRange } from "@/features/date-range/date-range";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = resolveDateRange(Object.fromEntries(url.searchParams.entries()));
  const report = await loadGlobalClickReport({
    pagePath: url.searchParams.get("pagePath") || undefined,
    ...range,
  });
  return NextResponse.json({
    ok: true,
    ...report,
  });
}
