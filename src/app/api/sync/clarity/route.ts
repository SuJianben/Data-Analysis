import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchClarityInsights } from "@/services/connectors/clarity";
import { finishSync, saveSnapshot, startSync } from "@/services/database/repositories";

export const runtime = "nodejs";

const schema = z.object({
  apiToken: z.string().optional(),
  numOfDays: z.number().int().min(1).max(3),
});

export async function POST(request: Request) {
  const syncId = startSync("clarity");
  try {
    const input = schema.parse(await request.json());
    const payload = await fetchClarityInsights(input);
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - input.numOfDays + 1);
    saveSnapshot(payload as Record<string, unknown>, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10), "clarity");
    const rowCount = Array.isArray(payload) ? payload.length : 1;
    finishSync(syncId, "success", rowCount, "Clarity 快照同步完成");
    return NextResponse.json({ ok: true, syncId, rowCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clarity 同步失败";
    finishSync(syncId, "failed", 0, message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
