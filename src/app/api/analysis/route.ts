import { NextResponse } from "next/server";
import { analyzeWithConfiguredProvider } from "@/services/connectors/ai";
import { loadAnalysisDataset } from "@/services/connectors/analytics";
import { saveAnalysis } from "@/services/database/repositories";
import { resolveDateRange } from "@/features/date-range/date-range";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { question?: string; startDate?: string; endDate?: string };
    const range = resolveDateRange(body);
    const dataset = await loadAnalysisDataset(range);
    const result = await analyzeWithConfiguredProvider(dataset, body.question);
    const periodStart = range.startDate;
    const periodEnd = range.endDate;
    saveAnalysis(result, periodStart, periodEnd);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 },
    );
  }
}
