import { NextResponse } from "next/server";
import { getDatabaseStats } from "@/services/database/repositories";
import { ensureRuntimeSnapshotFresh } from "@/services/database/runtime-snapshot";

export const runtime = "nodejs";

export async function GET() {
  await ensureRuntimeSnapshotFresh();
  return NextResponse.json({
    ok: true,
    service: "multi-site-analytics",
    timestamp: new Date().toISOString(),
    database: getDatabaseStats(),
  });
}
