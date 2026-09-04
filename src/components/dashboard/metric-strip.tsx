import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";
import type { DashboardSummary } from "@/types/analytics";

export function MetricStrip({ summary }: { summary: DashboardSummary }) {
  const metrics = [
    {
      label: "菜单点击",
      value: formatNumber(summary.clicks),
      note: summary.clickChange === null ? "等待对比数据" : `较前一日 ${summary.clickChange >= 0 ? "+" : ""}${summary.clickChange.toFixed(1)}%`,
    },
    { label: "已识别菜单", value: formatNumber(summary.menus), note: "按名称去重" },
    { label: "购买次数", value: formatNumber(summary.purchases), note: `用户日累计 ${formatNumber(summary.users)}` },
    { label: "关联销售额", value: formatCurrency(summary.revenue), note: `更新于 ${formatDateTime(summary.latestSync)}` },
  ];
  return (
    <section className="metric-strip" aria-label="核心指标">
      {metrics.map((metric) => (
        <div className="metric-item" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.note}</small>
        </div>
      ))}
    </section>
  );
}
