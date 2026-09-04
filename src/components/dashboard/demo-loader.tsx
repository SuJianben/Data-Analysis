"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoLoader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function loadDemo() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/demo", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "演示数据导入失败");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "演示数据导入失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="empty-state">
      <span className="empty-index">00</span>
      <div>
        <h2>先验证完整链路</h2>
        <p>载入14天演示数据，检查报表、数据库和 AI 分析是否正常，再接入真实接口。</p>
      </div>
      <button className="button button-primary" onClick={loadDemo} disabled={loading}>
        {loading ? "正在导入…" : "载入演示数据"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
