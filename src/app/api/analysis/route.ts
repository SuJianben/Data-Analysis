import { NextResponse } from "next/server";
import { analyzeWithConfiguredProvider } from "@/services/connectors/ai";
import {
  getClickTrend,
  getDashboardSummary,
  getLatestSnapshot,
  getMenuReportRows,
  getSiteMetricReportRows,
  saveAnalysis,
} from "@/services/database/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { question?: string };
    const dataset = {
      summary: getDashboardSummary(),
      menuRows: getMenuReportRows(),
      trend: getClickTrend(),
      siteMetrics: getSiteMetricReportRows(),
      claritySnapshot: getLatestSnapshot("clarity"),
    };
    const result = await analyzeWithConfiguredProvider(dataset, body.question);
    const periodStart = dataset.trend[0]?.date || new Date().toISOString().slice(0, 10);
    const periodEnd = dataset.trend.at(-1)?.date || periodStart;
    saveAnalysis(result, periodStart, periodEnd);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "分析失败" },
      { status: 500 },
    );
  }
}
