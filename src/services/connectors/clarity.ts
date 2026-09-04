import { appConfig } from "@/config/env";

export type ClaritySyncInput = {
  apiToken?: string;
  numOfDays: number;
};

export async function fetchClarityInsights(input: ClaritySyncInput) {
  const apiToken = input.apiToken || appConfig.clarityApiToken;
  if (!apiToken) {
    throw new Error("缺少 Clarity API Token。请在数据源页面临时输入，或配置 CLARITY_API_TOKEN。");
  }
  const numOfDays = Math.max(1, Math.min(3, Math.floor(input.numOfDays)));
  const url = new URL("https://www.clarity.ms/export-data/api/v1/project-live-insights");
  url.searchParams.set("numOfDays", String(numOfDays));
  url.searchParams.set("dimension1", "Device");
  url.searchParams.set("dimension2", "URL");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: "no-store",
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const detail = typeof payload === "object" && payload && "message" in payload
      ? String((payload as { message: unknown }).message)
      : `Clarity 请求失败（${response.status}）`;
    throw new Error(detail);
  }
  return payload;
}
