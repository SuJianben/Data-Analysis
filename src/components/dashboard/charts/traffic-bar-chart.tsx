import { TimeSeriesChart } from "@/components/data-chart/time-series-chart";
import type { DateRange } from "@/features/date-range/date-range";
import type { TrafficTrendPoint } from "@/types/analytics";

export function TrafficBarChart({ data, dateRange }: { data: TrafficTrendPoint[]; dateRange: DateRange }) {
  return (
    <TimeSeriesChart
      data={data.map(({ date, pageViews, users, sessions }) => ({ date, values: { pageViews, users, sessions } }))}
      dateRange={dateRange}
      series={[
        { key: "pageViews", label: "页面浏览", color: "#315efb" },
        { key: "users", label: "访问用户", color: "#7184c7" },
        { key: "sessions", label: "会话", color: "#9ca4b8" },
      ]}
      ariaLabel="流量趋势图"
    />
  );
}
