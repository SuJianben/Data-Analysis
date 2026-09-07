"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { defaultDateRange } from "@/utils/format";
import type { Ga4CredentialMode } from "@/types/analytics";

type Notice = { type: "success" | "error"; message: string } | null;

export function SourceManager({
  propertyId,
  ga4CredentialMode,
  clarityConfigured,
}: {
  propertyId: string;
  ga4CredentialMode: Ga4CredentialMode;
  clarityConfigured: boolean;
}) {
  const defaults = defaultDateRange(7);
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [ga, setGa] = useState({ propertyId, accessToken: "", startDate: defaults.start, endDate: defaults.end });
  const [clarity, setClarity] = useState({ apiToken: "", numOfDays: 1 });
  const ga4Configured = ga4CredentialMode !== "none";
  const ga4Status = {
    oauth: "OAuth 已固定",
    service_account: "服务账号已固定",
    access_token: "Access Token 已配置",
    none: "尚未固定 · 可临时同步",
  }[ga4CredentialMode];

  async function sync(url: string, body: object, source: string) {
    setBusy(source);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await response.text();
      let result: { error?: string; rowCount?: number } = {};
      try {
        result = JSON.parse(raw) as typeof result;
      } catch {
        throw new Error(
          response.status >= 500
            ? `同步服务暂时不可用（HTTP ${response.status}）。请稍后重试。`
            : "同步接口返回了无效内容，请检查服务器状态。",
        );
      }
      if (!response.ok) throw new Error(result.error || "同步失败");
      setNotice({ type: "success", message: `${source} 同步完成，共写入 ${result.rowCount} 行。` });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "同步失败" });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="source-stack">
      {notice && <div className={`notice notice-${notice.type}`}>{notice.message}</div>}
      <section className="source-panel">
        <div className="source-heading">
          <span className="source-index">01</span>
          <div><h2>Google Analytics 4</h2><p>同步菜单点击、访问、加购、结账、购买和销售额。</p></div>
          <span className={`source-badge ${ga4Configured ? "source-ready" : ""}`}>
            {ga4Status}
          </span>
        </div>
        <div className="form-grid">
          <label><span>Property ID</span><input value={ga.propertyId} onChange={(event) => setGa({ ...ga, propertyId: event.target.value })} /></label>
          <label className="field-wide"><span>Access Token（{ga4Configured ? "已固定时无需填写" : "仅本次请求使用"}）</span><input type="password" autoComplete="off" value={ga.accessToken} onChange={(event) => setGa({ ...ga, accessToken: event.target.value })} placeholder={ga4Configured ? "使用本机固定凭证自动认证" : "ya29..."} /></label>
          <label><span>开始日期</span><input type="date" value={ga.startDate} onChange={(event) => setGa({ ...ga, startDate: event.target.value })} /></label>
          <label><span>结束日期</span><input type="date" value={ga.endDate} onChange={(event) => setGa({ ...ga, endDate: event.target.value })} /></label>
          <div className="form-action"><button className="button button-primary" disabled={Boolean(busy)} onClick={() => sync("/api/sync/ga4", ga, "GA4")}>{busy === "GA4" ? "同步中…" : "同步 GA4"}</button></div>
        </div>
      </section>
      <section className="source-panel">
        <div className="source-heading">
          <span className="source-index">02</span>
          <div><h2>Microsoft Clarity</h2><p>保存设备、URL与行为异常指标快照，用于补充页面体验分析。</p></div>
          <span className={`source-badge ${clarityConfigured ? "source-ready" : ""}`}>
            {clarityConfigured ? "Token 已固定" : "尚未固定 · 最多回看3天"}
          </span>
        </div>
        <div className="form-grid">
          <label className="field-wide"><span>API Token（{clarityConfigured ? "已固定时无需填写" : "仅本次请求使用"}）</span><input type="password" autoComplete="off" value={clarity.apiToken} onChange={(event) => setClarity({ ...clarity, apiToken: event.target.value })} placeholder={clarityConfigured ? "使用本机固定 Token" : "Clarity Bearer Token"} /></label>
          <label><span>查询天数</span><select value={clarity.numOfDays} onChange={(event) => setClarity({ ...clarity, numOfDays: Number(event.target.value) })}><option value={1}>1天</option><option value={2}>2天</option><option value={3}>3天</option></select></label>
          <div className="form-action"><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => sync("/api/sync/clarity", clarity, "Clarity")}>{busy === "Clarity" ? "同步中…" : "保存 Clarity 快照"}</button></div>
        </div>
      </section>
      <section className="source-panel import-panel">
        <div className="source-heading">
          <span className="source-index">03</span>
          <div><h2>标准化导入接口</h2><p>其他脚本或系统可直接向本机推送数据。</p></div>
          <code>POST /api/import</code>
        </div>
        <pre className="code-sample">{`{
  "source": "shopify",
  "period": { "start": "2026-09-01", "end": "2026-09-02" },
  "menuMetrics": [{
    "date": "2026-09-02",
    "menuName": "Kulüpler",
    "menuKey": "clubs",
    "clickCount": 23
  }]
}`}</pre>
      </section>
    </div>
  );
}
