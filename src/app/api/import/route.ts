import { NextResponse } from "next/server";
import { z } from "zod";
import { importDataset } from "@/services/database/repositories";

export const runtime = "nodejs";

const menuMetricSchema = z.object({
  date: z.string().min(8),
  deviceCategory: z.string().optional(),
  menuName: z.string().min(1),
  menuKey: z.string().optional(),
  parentMenuName: z.string().optional(),
  menuLevel: z.string().optional(),
  menuAction: z.string().optional(),
  navigationLocation: z.string().optional(),
  clickTarget: z.string().optional(),
  clickCount: z.number().nonnegative(),
});

const siteMetricSchema = z.object({
  date: z.string().min(8),
  deviceCategory: z.string().optional(),
  eventName: z.string().min(1),
  eventCount: z.number().nonnegative(),
  totalUsers: z.number().nonnegative().optional(),
  totalRevenue: z.number().nonnegative().optional(),
});

const heatmapMetricSchema = z.object({
  date: z.string().min(8),
  deviceCategory: z.string().optional(),
  pagePath: z.string().min(1),
  heatmapCell: z.string().regex(/^x\d+_y\d+$/),
  elementGroup: z.string().optional(),
  pageSection: z.string().optional(),
  clickTarget: z.string().optional(),
  scrollBucket: z.string().optional(),
  clickCount: z.number().nonnegative(),
});

const globalClickMetricSchema = z.object({
  date: z.string().min(8),
  deviceCategory: z.string().optional(),
  pagePath: z.string().min(1),
  elementKey: z.string().min(1),
  elementLabel: z.string().optional(),
  pageSection: z.string().optional(),
  destinationPath: z.string().optional(),
  clickTarget: z.string().optional(),
  clickCount: z.number().nonnegative(),
});

const userEventSchema = z.object({
  eventId: z.string().min(8).max(160),
  visitorId: z.string().min(8).max(160),
  customerIdHash: z.string().max(200).optional(),
  sessionId: z.string().max(160).optional(),
  eventName: z.string().min(1).max(120),
  occurredAt: z.string().min(10).max(80),
  pagePath: z.string().max(2000).optional(),
  elementKey: z.string().max(300).optional(),
  elementLabel: z.string().max(500).optional(),
  pageSection: z.string().max(200).optional(),
  destinationPath: z.string().max(2000).optional(),
  clickTarget: z.string().max(120).optional(),
  deviceCategory: z.string().max(40).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const importSchema = z.object({
  source: z.string().min(1),
  period: z.object({ start: z.string().min(8), end: z.string().min(8) }),
  menuMetrics: z.array(menuMetricSchema).optional(),
  siteMetrics: z.array(siteMetricSchema).optional(),
  heatmapMetrics: z.array(heatmapMetricSchema).optional(),
  globalClickMetrics: z.array(globalClickMetricSchema).optional(),
  userEvents: z.array(userEventSchema).max(10000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = importSchema.parse(await request.json());
    const result = importDataset(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "数据格式不正确", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "导入失败" },
      { status: 500 },
    );
  }
}
