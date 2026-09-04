import { NextResponse } from "next/server";
import { z } from "zod";
import { appConfig } from "@/config/env";
import { saveUserEvents } from "@/services/database/repositories";
import type { UserEventInput } from "@/types/analytics";

export const runtime = "nodejs";

const eventSchema = z.object({
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

const bodySchema = z.object({
  source: z.string().min(1).max(80).default("storefront"),
  event: eventSchema.optional(),
  events: z.array(eventSchema).max(50).optional(),
}).refine((value) => Boolean(value.event) || Boolean(value.events?.length), {
  message: "event 或 events 至少需要一个事件。",
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, x-tkf-ingest-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  const expectedKey = appConfig.userEventIngestKey;
  if (expectedKey && request.headers.get("x-tkf-ingest-key") !== expectedKey) {
    return NextResponse.json({ ok: false, error: "事件接收凭证无效。" }, { status: 401, headers: corsHeaders() });
  }

  try {
    const payload = bodySchema.parse(await request.json());
    const events = (payload.events || (payload.event ? [payload.event] : [])) as UserEventInput[];
    const inserted = saveUserEvents(payload.source, events);
    return NextResponse.json({ ok: true, received: events.length, inserted }, { headers: corsHeaders() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "用户事件格式不正确。", details: error.issues }, { status: 400, headers: corsHeaders() });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "事件接收失败。" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
