import type { TrendPoint } from "@/types/analytics";
import { formatNumber } from "@/utils/format";

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const width = 760;
  const height = 250;
  const padding = 24;
  const max = Math.max(...data.map((item) => item.clicks), 1);
  const min = Math.min(...data.map((item) => item.clicks), 0);
  const range = Math.max(max - min, 1);
  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((item.clicks - min) / range) * (height - padding * 2);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = points.length ? `${path} L${points.at(-1)?.x},${height - padding} L${points[0].x},${height - padding} Z` : "";

  if (!data.length) {
    return <div className="chart-empty">同步数据后，这里会显示最近30天的菜单点击趋势。</div>;
  }

  return (
    <div className="chart-wrap">
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="菜单点击趋势图">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#315efb" stopOpacity="0.2" />
            <stop offset="1" stopColor="#315efb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((line) => (
          <line key={line} x1={padding} x2={width - padding} y1={height * line} y2={height * line} className="chart-grid" />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={path} className="chart-line" />
        {points.map((point) => (
          <g className="chart-point" key={point.date}>
            <circle cx={point.x} cy={point.y} r="4" />
            <title>{`${point.date}: ${formatNumber(point.clicks)} 次`}</title>
          </g>
        ))}
      </svg>
      <div className="chart-axis">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[Math.floor((data.length - 1) / 2)]?.date.slice(5)}</span>
        <span>{data.at(-1)?.date.slice(5)}</span>
      </div>
    </div>
  );
}
