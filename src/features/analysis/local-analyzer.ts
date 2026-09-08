import type { AnalysisResult, DashboardSummary, MenuReportRow, SiteMetricInput, TrendPoint } from "@/types/analytics";

export type AnalysisDataset = {
  summary: DashboardSummary;
  menuRows: MenuReportRow[];
  trend: TrendPoint[];
  siteMetrics: SiteMetricInput[];
  claritySnapshot: unknown | null;
};

function percentage(part: number, total: number) {
  return total ? `${((part / total) * 100).toFixed(1)}%` : "0%";
}

export function runLocalAnalysis(dataset: AnalysisDataset): AnalysisResult {
  const { summary, menuRows, trend } = dataset;
  const top = menuRows[0];
  const topThreeClicks = menuRows.slice(0, 3).reduce((sum, row) => sum + row.clickCount, 0);
  const zeroContext = summary.clicks === 0;
  const mobileClicks = menuRows.filter((row) => row.deviceCategory === "mobile").reduce((sum, row) => sum + row.clickCount, 0);
  const parentClicks = menuRows.filter((row) => !row.parentMenuName).reduce((sum, row) => sum + row.clickCount, 0);
  const childClicks = Math.max(0, summary.clicks - parentClicks);
  const findings: AnalysisResult["findings"] = [];

  if (zeroContext) {
    findings.push({
      title: "等待真实数据",
      evidence: "当前数据库中还没有菜单点击记录。",
      recommendation: "等待本机自动同步 GA4，或执行一次本机同步脚本。",
      severity: "attention",
    });
  } else {
    findings.push({
      title: "点击集中度",
      evidence: `前三个菜单贡献 ${percentage(topThreeClicks, summary.clicks)} 的全部菜单点击。`,
      recommendation: "优先检查这三个入口的商品承接页和转化表现，并避免仅凭点击量调整顺序。",
      severity: topThreeClicks / summary.clicks > 0.7 ? "important" : "info",
    });
    if (top) {
      findings.push({
        title: "当前首要入口",
        evidence: `${top.menuName} 记录 ${top.clickCount.toLocaleString("zh-CN")} 次点击，是当前最高的菜单入口。`,
        recommendation: "将其与商品浏览、加入购物车和购买数据联查，确认高点击是否带来高价值。",
        severity: "info",
      });
    }
    findings.push({
      title: "设备与层级",
      evidence: `移动端贡献 ${percentage(mobileClicks, summary.clicks)}；二级菜单约占 ${percentage(childClicks, summary.clicks)}。`,
      recommendation: "分别检查移动端菜单展开体验，以及高流量父菜单下的二级入口是否容易发现。",
      severity: "attention",
    });
  }

  const first = trend[0]?.clicks || 0;
  const last = trend.at(-1)?.clicks || 0;
  const direction = last > first ? "上升" : last < first ? "下降" : "持平";

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    headline: zeroContext ? "尚未形成可分析样本" : `菜单点击整体${direction}，${top?.menuName || "头部菜单"}最值得优先复盘`,
    summary: zeroContext
      ? "完成一次数据导入后，系统会自动分析集中度、设备差异、菜单层级和趋势。"
      : `本次基于 ${summary.clicks.toLocaleString("zh-CN")} 次点击、${summary.menus} 个菜单入口生成。当前结论用于发现方向，不替代购买转化验证。`,
    findings,
    nextActions: zeroContext
      ? ["导入演示数据", "同步 GA4 菜单事件", "补充购买和销售额指标"]
      : ["把前三菜单与购买数据关联", "按移动端和桌面端分别复盘", "连续观察至少 7 天再调整菜单结构"],
  };
}
