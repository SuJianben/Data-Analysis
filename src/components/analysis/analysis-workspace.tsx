"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analytics";
import type { DateRange } from "@/features/date-range/date-range";
import { formatDateTime } from "@/utils/format";
import type { SiteKey } from "@/config/sites";

function displayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join("；");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${displayText(item)}`)
      .join("；");
  }
  return "—";
}

export function AnalysisWorkspace({ initialResult, dateRange, site }: { initialResult: AnalysisResult | null; dateRange: DateRange; site: SiteKey }) {
  const [result, setResult] = useState(initialResult);
  const [question, setQuestion] = useState("分析菜单表现，并指出最值得优先验证的三个问题。");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, ...dateRange, site }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "分析失败");
      setResult(payload.result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="analysis-layout">
      <aside className="analysis-prompt">
        <span className="eyebrow">ANALYSIS BRIEF</span>
        <h2>告诉 AI 这次要判断什么</h2>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={7} />
        <button className="button button-primary" onClick={analyze} disabled={loading || !question.trim()}>{loading ? "正在分析…" : "生成分析"}</button>
        <p>分析范围：{dateRange.startDate} 至 {dateRange.endDate}</p>
        <p>未配置 AI_API_KEY 时自动使用本地规则分析，数据不会离开本机。</p>
        {error && <p className="form-error">{error}</p>}
      </aside>
      <section className="analysis-result" aria-live="polite">
        {!result ? (
          <div className="analysis-empty"><span>AI</span><h2>还没有分析结果</h2><p>生成后会在这里展示证据、建议和下一步动作。</p></div>
        ) : (
          <>
            <div className="analysis-meta"><span className={`mode-badge mode-${result.mode}`}>{result.mode === "ai" ? "AI 接口" : "本地规则"}</span><time>{formatDateTime(result.generatedAt)}</time></div>
            <h2>{displayText(result.headline)}</h2>
            <p className="analysis-summary">{displayText(result.summary)}</p>
            <div className="finding-list">
              {result.findings.map((finding, index) => (
                <article className="finding" key={`${finding.title}-${index}`}>
                  <span className={`severity severity-${finding.severity}`} />
                  <div><h3>{displayText(finding.title)}</h3><p>{displayText(finding.evidence)}</p><strong>建议</strong><p>{displayText(finding.recommendation)}</p></div>
                </article>
              ))}
            </div>
            <div className="next-actions"><span>下一步</span><ol>{result.nextActions.map((action, index) => <li key={`${index}-${displayText(action)}`}>{displayText(action)}</li>)}</ol></div>
          </>
        )}
      </section>
    </div>
  );
}
