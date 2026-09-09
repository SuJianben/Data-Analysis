import type { DeviceStatPoint } from "@/types/analytics";

export function aggregateDeviceStats<T>(
  rows: T[],
  deviceOf: (row: T) => string | undefined,
  valueOf: (row: T) => number,
): DeviceStatPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const deviceCategory = deviceOf(row)?.trim() || "unknown";
    totals.set(deviceCategory, (totals.get(deviceCategory) || 0) + Number(valueOf(row) || 0));
  }
  return Array.from(totals, ([deviceCategory, value]) => ({ deviceCategory, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value || a.deviceCategory.localeCompare(b.deviceCategory));
}
