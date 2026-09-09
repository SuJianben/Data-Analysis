"use client";

import { useState } from "react";
import type { DeviceBreakdownPoint } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

const labels: Record<string, string> = { desktop: "桌面端", mobile: "手机端", tablet: "平板端", "smart tv": "智能电视", unknown: "未识别设备" };
const colors = ["#315efb", "#7184c7", "#9ca4b8", "#c7cbd6"];

export function DeviceDonutChart({ data }: { data: DeviceBreakdownPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const totalUsers = data.reduce((sum, item) => sum + Number(item.users || 0), 0);
  const totalViews = data.reduce((sum, item) => sum + Number(item.pageViews || 0), 0);
  const total = totalUsers || totalViews;
  const circumference = 2 * Math.PI * 52;
  let offset = 0;

  if (!data.length || !total) return <div className="chart-empty">当前范围暂无设备构成数据。</div>;

  return (
    <div className="donut-chart-wrap">
      <div className="donut-visual">
        <svg className="donut-chart" viewBox="0 0 140 140" role="img" aria-label="设备构成环形图">
          <circle cx="70" cy="70" r="52" fill="none" stroke="var(--line)" strokeWidth="18" />
          {data.map((item, index) => {
            const value = Number(item.users || 0) || Number(item.pageViews || 0);
            const length = (value / total) * circumference;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                key={item.deviceCategory}
                className="donut-segment"
                cx="70"
                cy="70"
                r="52"
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth={activeIndex === index ? 21 : 18}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 70 70)"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <title>{`${labels[item.deviceCategory] || item.deviceCategory}：${formatNumber(value)}`}</title>
              </circle>
            );
          })}
          <text x="70" y="66" textAnchor="middle" className="donut-total">{formatNumber(total)}</text>
          <text x="70" y="80" textAnchor="middle" className="donut-caption">访问用户</text>
        </svg>
      </div>
      <div className="donut-legend">
        {data.map((item, index) => {
          const value = Number(item.users || 0) || Number(item.pageViews || 0);
          return <div key={item.deviceCategory} className={activeIndex === index ? "is-active" : ""} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}><i style={{ background: colors[index % colors.length] }} /><span>{labels[item.deviceCategory] || item.deviceCategory}</span><strong>{formatNumber(value)}</strong></div>;
        })}
      </div>
    </div>
  );
}
