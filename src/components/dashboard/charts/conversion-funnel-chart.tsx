import type { ConversionFunnelPoint } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

export function ConversionFunnelChart({ data }: { data: ConversionFunnelPoint[] }) {
  const max = Math.max(...data.map((item) => item.count), 0);
  if (!data.length || !max) return <div className="chart-empty">当前范围暂无转化事件数据。</div>;

  return (
    <div className="funnel-chart" role="img" aria-label="转化漏斗图">
      {data.map((item, index) => {
        const previous = data[index - 1]?.count;
        const rate = previous ? (item.count / previous) * 100 : null;
        return (
          <div className="funnel-row" key={item.key}>
            <div className="funnel-label"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong></div>
            <div className="funnel-track"><i style={{ width: `${Math.max((item.count / max) * 100, item.count ? 2 : 0)}%` }} title={`${item.label}：${formatNumber(item.count)}`} /></div>
            <strong className="funnel-value">{formatNumber(item.count)}</strong>
            <small>{rate === null ? "基准" : `${rate.toFixed(1)}%`}</small>
          </div>
        );
      })}
    </div>
  );
}
