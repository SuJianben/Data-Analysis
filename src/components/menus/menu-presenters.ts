import type { MenuReportRow } from "@/types/analytics";

const actionLabels: Record<string, string> = {
  navigate: "跳转",
  expand: "展开",
  collapse: "收起",
};

const targetLabels: Record<string, string> = {
  label: "文字",
  link: "链接",
  image: "图片",
  indicator: "展开按钮",
};

const deviceLabels: Record<string, string> = {
  desktop: "桌面端",
  mobile: "手机端",
  tablet: "平板端",
  unknown: "未知设备",
};

function meaningful(value?: string) {
  const normalized = value?.trim() || "";
  return normalized && normalized !== "(not set)" && normalized !== "(未设置)" ? normalized : "";
}

function mergeValues(current: string, next?: string) {
  const values = new Set(current.split(" / ").filter(Boolean));
  const value = meaningful(next);
  if (value) values.add(value);
  return Array.from(values).join(" / ");
}

export function prepareMenuRows(rows: MenuReportRow[]): MenuReportRow[] {
  const grouped = new Map<string, MenuReportRow>();

  for (const row of rows) {
    const menuName = meaningful(row.menuName) || "(未命名菜单)";
    const menuKey = meaningful(row.menuKey);
    const deviceCategory = meaningful(row.deviceCategory) || "unknown";
    const identity = `${menuKey || menuName}::${deviceCategory}`;
    const existing = grouped.get(identity);

    if (!existing) {
      grouped.set(identity, {
        ...row,
        menuName,
        menuKey,
        parentMenuName: meaningful(row.parentMenuName),
        menuLevel: meaningful(row.menuLevel),
        menuAction: meaningful(row.menuAction),
        clickTarget: meaningful(row.clickTarget),
        deviceCategory,
      });
      continue;
    }

    existing.menuName = existing.menuName === "(未命名菜单)" && menuName !== "(未命名菜单)" ? menuName : existing.menuName;
    existing.parentMenuName = existing.parentMenuName || meaningful(row.parentMenuName);
    existing.menuLevel = existing.menuLevel || meaningful(row.menuLevel);
    existing.menuAction = mergeValues(existing.menuAction, row.menuAction);
    existing.clickTarget = mergeValues(existing.clickTarget, row.clickTarget);
    existing.clickCount += row.clickCount;
  }

  return Array.from(grouped.values()).sort((a, b) => b.clickCount - a.clickCount || a.menuName.localeCompare(b.menuName));
}

export function menuActionLabel(value?: string) {
  return (value || "—")
    .split(" / ")
    .map((item) => actionLabels[item] || item)
    .join(" / ");
}

export function menuTargetLabel(value?: string) {
  return (value || "—")
    .split(" / ")
    .map((item) => targetLabels[item] || item)
    .join(" / ");
}

export function menuDeviceLabel(value?: string) {
  return deviceLabels[value || ""] || value || "未知设备";
}

export function menuLevelLabel(value?: string) {
  if (!value || value === "(not set)") return "未标注";
  if (value === "0") return "主菜单";
  return `第 ${value} 层`;
}
