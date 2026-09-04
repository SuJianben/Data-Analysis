import { NextResponse } from "next/server";
import { getDatabaseStats } from "@/services/database/repositories";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "tkf-signal",
    timestamp: new Date().toISOString(),
    database: getDatabaseStats(),
  });
}
