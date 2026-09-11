import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchGa4Data } from "@/services/connectors/ga4";
import { finishSync, saveGlobalClickMetrics, saveHeatmapMetrics, saveMenuMetrics, saveSiteMetrics, saveSnapshot, startSync } from "@/services/database/repositories";

export const runtime = "nodejs";

const schema = z.object({
  siteKey: z.enum(["tkf", "tms"]).default("tkf"),
  accessToken: z.string().optional(),
  propertyId: z.string().min(1),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
});

export async function POST(request: Request) {
  let syncId: number | null = null;
  try {
    const input = schema.parse(await request.json());
    const source = `ga4:${input.siteKey}`;
    syncId = startSync(source, input.siteKey);
    const result = await fetchGa4Data(input);
    saveMenuMetrics(source, result.menuMetrics, input.siteKey);
    saveSiteMetrics(source, result.siteMetrics, input.siteKey);
    saveHeatmapMetrics(source, result.heatmapMetrics, input.siteKey);
    saveGlobalClickMetrics(source, result.globalClickMetrics, input.siteKey);
    saveSnapshot(
      { siteKey: input.siteKey, source, counts: { menus: result.menuMetrics.length, metrics: result.siteMetrics.length, heatmap: result.heatmapMetrics.length, globalClicks: result.globalClickMetrics.length }, warnings: result.warnings },
      input.startDate,
      input.endDate,
      source,
      input.siteKey,
    );
    const rowCount = result.menuMetrics.length + result.siteMetrics.length + result.heatmapMetrics.length + result.globalClickMetrics.length;
    const message = result.warnings.length
      ? `GA4 已同步，热力数据待配置：${result.warnings.join("；")}`
      : (rowCount ? "GA4 数据同步完成" : "GA4 请求成功，但该日期范围暂无标准报表数据");
    finishSync(syncId, "success", rowCount, message);
    return NextResponse.json({ ok: true, syncId, rowCount, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GA4 同步失败";
    if (syncId !== null) finishSync(syncId, "failed", 0, message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
