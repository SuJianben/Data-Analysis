import { NextResponse } from "next/server";
import { z } from "zod";
import { appConfig } from "@/config/env";
import { ingestUserEvents } from "@/features/users/event-ingestion";
import { userEventPayloadSchema } from "@/features/users/event-schema";
import type { UserEventInput } from "@/types/analytics";

export const runtime = "nodejs";

function corsHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "content-type, x-tkf-ingest-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function requestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const browserAllowed = Boolean(
    origin && (
      !appConfig.userEventAllowedOrigins.length ||
      appConfig.userEventAllowedOrigins.includes(origin)
    ),
  );
  const serverAllowed = Boolean(
    appConfig.userEventIngestKey &&
    request.headers.get("x-tkf-ingest-key") === appConfig.userEventIngestKey,
  );
  const localOpenMode = Boolean(
    !origin &&
    !appConfig.userEventIngestKey &&
    !appConfig.userEventAllowedOrigins.length,
  );
  return { origin, browserAllowed, serverAllowed, allowed: browserAllowed || serverAllowed || localOpenMode };
}

export async function OPTIONS(request: Request) {
  const origin = requestOrigin(request);
  if (!origin.browserAllowed) return new NextResponse(null, { status: 403, headers: corsHeaders(origin.origin) });
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin.origin) });
}

export async function POST(request: Request) {
  const origin = requestOrigin(request);
  if (!origin.allowed) {
    return NextResponse.json({ ok: false, error: "该来源不允许提交用户事件。" }, { status: 403, headers: corsHeaders(origin.origin) });
  }
  try {
    const rawBody = await request.text();
    if (rawBody.length > 256_000) {
      return NextResponse.json({ ok: false, error: "用户事件请求体过大。" }, { status: 413, headers: corsHeaders(origin.origin) });
    }
    const payload = userEventPayloadSchema.parse(JSON.parse(rawBody));
    const events = (payload.events || (payload.event ? [payload.event] : [])) as UserEventInput[];
    const result = await ingestUserEvents(payload.source, events);
    return NextResponse.json({ ok: true, ...result }, { headers: corsHeaders(origin.origin) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "用户事件格式不正确。", details: error.issues }, { status: 400, headers: corsHeaders(origin.origin) });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "请求内容不是有效的 JSON。" }, { status: 400, headers: corsHeaders(origin.origin) });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "事件接收失败。" },
      { status: 500, headers: corsHeaders(origin.origin) },
    );
  }
}
