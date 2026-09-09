import type { PageEntryPoint } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

export function PageEntryChart({ data }: { data: PageEntryPoint[] }) {
  const max = Math.max(...data.map((item) => item.clicks), 0);
  if (!data.length || !max) return <div className="chart-empty">当前范围暂无页面入口点击数据。</div>;

  return (
    <div className="page-entry-chart" role="img" aria-label="页面入口点击排行">
      {data.map((item, index) => (
        <div className="page-entry-row" key={item.pagePath}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div><strong title={item.pagePath}>{item.pagePath}</strong><i style={{ width: `${Math.max((item.clicks / max) * 100, 2)}%` }} title={`${formatNumber(item.clicks)} 次点击`} /></div>
          <b>{formatNumber(item.clicks)}</b>
        </div>
      ))}
    </div>
  );
}
