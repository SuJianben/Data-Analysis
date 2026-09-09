import type { DistributionPoint, GlobalClickReportRow, MenuReportRow } from "@/types/analytics";

export function buildMenuDistributionPoints(rows: MenuReportRow[]): DistributionPoint[] {
  const grouped = new Map<string, { label: string; clicks: number; devices: Set<string> }>();
  for (const row of rows) {
    const id = row.menuKey || row.menuName || "unknown";
    const item = grouped.get(id) || { label: row.menuName || id, clicks: 0, devices: new Set<string>() };
    item.clicks += Number(row.clickCount || 0);
    if (row.deviceCategory) item.devices.add(row.deviceCategory);
    grouped.set(id, item);
  }
  return Array.from(grouped, ([id, item]) => ({ id, label: item.label, x: item.clicks, y: item.devices.size, category: "default" as const, details: [`设备覆盖：${item.devices.size} 类`] }))
    .filter((point) => point.x > 0)
    .sort((a, b) => b.x - a.x);
}

export function buildElementDistributionPoints(rows: GlobalClickReportRow[]): DistributionPoint[] {
  const grouped = new Map<string, { label: string; clicks: number; pages: Set<string> }>();
  for (const row of rows) {
    const id = row.elementKey || row.elementLabel || row.pagePath || "unknown";
    const item = grouped.get(id) || { label: row.elementLabel || row.elementKey || "未命名元素", clicks: 0, pages: new Set<string>() };
    item.clicks += Number(row.clickCount || 0);
    if (row.pagePath) item.pages.add(row.pagePath);
    grouped.set(id, item);
  }
  return Array.from(grouped, ([id, item]) => ({ id, label: item.label, x: item.clicks, y: item.pages.size, category: "default" as const, details: [`页面覆盖：${item.pages.size} 个`] }))
    .filter((point) => point.x > 0)
    .sort((a, b) => b.x - a.x);
}
