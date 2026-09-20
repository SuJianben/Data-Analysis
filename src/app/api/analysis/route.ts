import { NextResponse } from "next/server";
import { analyzeWithConfiguredProvider } from "@/services/connectors/ai";
import { loadAnalysisDataset } from "@/services/connectors/analytics";
import { savePersistedAnalysis } from "@/services/analysis/analysis-result-store";
import { resolveDateRange } from "@/features/date-range/date-range";
import { resolveSite } from "@/features/site-selection/site-selection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { question?: string; startDate?: string; endDate?: string; site?: string };
    const range = resolveDateRange(body);
    const site = resolveSite(body as Record<string, string | string[] | undefined>);
    const dataset = await loadAnalysisDataset({ ...range, site });
    const result = await analyzeWithConfiguredProvider(dataset, body.question);
    await savePersistedAnalysis(
      { siteKey: site, startDate: range.startDate, endDate: range.endDate },
      body.question || "",
      result,
    );
    return NextResponse.json({ ok: true, result, persisted: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 },
    );
  }
}
