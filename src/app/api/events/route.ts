import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestUserEvents } from "@/features/users/event-ingestion";
import { userEventPayloadSchema } from "@/features/users/event-schema";
import { authorizeUserEventRequest, isAllowedPreflightOrigin } from "@/features/users/event-request-authorization";
import { applyEventWritePolicy } from "@/features/users/event-write-policy";
import type { UserEventInput } from "@/types/analytics";

export const runtime = "nodejs";

function corsHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "content-type, x-signal-ingest-key, x-tkf-ingest-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAllowedPreflightOrigin(origin)) return new NextResponse(null, { status: 403, headers: corsHeaders(origin) });
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    const rawBody = await request.text();
    if (rawBody.length > 256_000) {
      return NextResponse.json({ ok: false, error: "用户事件请求体过大。" }, { status: 413, headers: corsHeaders(origin) });
    }
    const payload = userEventPayloadSchema.parse(JSON.parse(rawBody));
    const events = (payload.events || (payload.event ? [payload.event] : [])) as UserEventInput[];
    const normalizedPayload = { siteKey: payload.siteKey, source: payload.source, events };
    if (!authorizeUserEventRequest(request, normalizedPayload)) {
      return NextResponse.json({ ok: false, error: "该来源不允许提交用户事件。" }, { status: 403, headers: corsHeaders(origin) });
    }
    const filtered = applyEventWritePolicy(request, normalizedPayload);
    if (!filtered.events.length) {
      return NextResponse.json({ ok: true, mode: "filtered", received: events.length, inserted: 0, filtered: filtered.filtered, optimized: filtered.optimized, filterReasons: filtered.reasons }, { headers: corsHeaders(origin) });
    }
    const result = await ingestUserEvents(payload.source, filtered.events, payload.siteKey);
    return NextResponse.json({ ok: true, ...result, filtered: filtered.filtered, optimized: filtered.optimized, filterReasons: filtered.reasons }, { headers: corsHeaders(origin) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "用户事件格式不正确。", details: error.issues }, { status: 400, headers: corsHeaders(origin) });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "请求内容不是有效的 JSON。" }, { status: 400, headers: corsHeaders(origin) });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "事件接收失败。" },
      { status: 503, headers: { ...corsHeaders(origin), "Retry-After": "60" } },
    );
  }
}
