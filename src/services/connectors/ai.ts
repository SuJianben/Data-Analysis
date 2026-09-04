import { appConfig } from "@/config/env";
import { runLocalAnalysis, type AnalysisDataset } from "@/features/analysis/local-analyzer";
import type { AnalysisFinding, AnalysisResult } from "@/types/analytics";

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 返回内容不是有效 JSON。");
  return JSON.parse(candidate.slice(start, end + 1));
}

const fieldLabels: Record<string, string> = {
  menuClicks: "菜单点击",
  menuCount: "菜单数量",
  users: "用户日累计",
  purchases: "购买次数",
  revenue: "销售额",
  topMenusByClicks: "高点击菜单",
  deviceSplit: "设备分布",
  trendObservation: "趋势观察",
  desktopClicks: "桌面端点击",
  mobileClicks: "移动端点击",
  totalClicks: "总点击",
  desktopShare: "桌面端占比",
  mobileShare: "移动端占比",
  menuName: "菜单",
};

function structuredText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(structuredText).filter(Boolean).join("；");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${fieldLabels[key] || key}：${structuredText(item)}`)
      .filter((item) => !item.endsWith("："))
      .join("，");
  }
  return "";
}

function normalizeAnalysisPayload(value: unknown): Omit<AnalysisResult, "mode" | "generatedAt"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI 返回的分析结构不正确。");
  }
  const record = value as Record<string, unknown>;
  const rawFindings = Array.isArray(record.findings) ? record.findings : [];
  const rawActions = Array.isArray(record.nextActions) ? record.nextActions : [];
  const findings = rawFindings
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const rawSeverity = structuredText(item.severity);
      const severity: AnalysisFinding["severity"] =
        rawSeverity === "attention" || rawSeverity === "important" ? rawSeverity : "info";
      return {
        title: structuredText(item.title) || "待核对发现",
        evidence: structuredText(item.evidence) || "AI 未提供具体证据。",
        recommendation: structuredText(item.recommendation) || "结合更多数据后再决定是否调整。",
        severity,
      };
    })
    .slice(0, 8);
  const nextActions = rawActions.map(structuredText).filter(Boolean).slice(0, 8);
  return {
    headline: structuredText(record.headline) || "数据分析已完成",
    summary: structuredText(record.summary) || "AI 未提供摘要。",
    findings,
    nextActions,
  };
}

export async function analyzeWithConfiguredProvider(dataset: AnalysisDataset, question?: string): Promise<AnalysisResult> {
  if (!appConfig.aiApiKey) return runLocalAnalysis(dataset);

  const clarityJson = dataset.claritySnapshot ? JSON.stringify(dataset.claritySnapshot) : "";
  const analysisPayload = {
    ...dataset,
    claritySnapshot: clarityJson
      ? { truncated: clarityJson.length > 20000, json: clarityJson.slice(0, 20000) }
      : null,
  };

  const response = await fetch(`${appConfig.aiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appConfig.aiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: appConfig.aiModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是电商数据分析师。只依据提供的数据作答，不虚构因果关系。输出纯 JSON，字段为 headline、summary、findings、nextActions。findings 每项包含 title、evidence、recommendation、severity，severity 只能是 info、attention、important。",
        },
        {
          role: "user",
          content: JSON.stringify({ question: question || "分析菜单表现并给出下一步建议", dataset: analysisPayload }),
        },
      ],
    }),
    cache: "no-store",
  });
  const payload = (await response.json()) as ChatResponse;
  if (!response.ok) throw new Error(payload.error?.message || `AI 请求失败（${response.status}）`);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 没有返回分析内容。");
  const parsed = normalizeAnalysisPayload(extractJson(content));
  return { ...parsed, mode: "ai", generatedAt: new Date().toISOString() };
}
