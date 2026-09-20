import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchGa4Data } from "@/services/connectors/ga4";
import { siteKeys } from "@/config/sites";
import { finishSync, startSync } from "@/services/database/repositories";
import { replaceGa4Snapshot } from "@/services/database/ga4-snapshot-repository";

export const runtime = "nodejs";

const schema = z.object({
  siteKey: z.enum(siteKeys).default("tkf"),
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
    const rowCount = replaceGa4Snapshot({
      siteKey: input.siteKey,
      source,
      startDate: input.startDate,
      endDate: input.endDate,
      dataset: result,
    });
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
