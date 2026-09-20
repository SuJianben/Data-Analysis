import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function equalSecret(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  const expectedKey = process.env.LOCAL_SYNC_ACCESS_KEY || process.env.USER_EVENT_FORWARD_KEY || "";
  const suppliedKey = request.headers.get("x-local-sync-key") || "";
  if (!expectedKey || !suppliedKey || !equalSecret(suppliedKey, expectedKey)) {
    return NextResponse.json({ ok: false, error: "本地同步凭证无效。" }, { status: 401 });
  }

  const token = request.headers.get("x-vercel-oidc-token") || "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Vercel 未提供生产队列凭证。" }, { status: 503 });
  }

  return NextResponse.json(
    { ok: true, token },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
