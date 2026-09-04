import { NextResponse } from "next/server";
import { importDataset } from "@/services/database/repositories";
import type { MenuMetricInput, SiteMetricInput } from "@/types/analytics";

export const runtime = "nodejs";

const menus = [
  ["Ana Sayfa", "home", "", "1", "navigate", "/"],
  ["Tüm giyim ürünleri", "all-apparel", "", "1", "navigate", "/collections/all"],
  ["26/27 forması", "season-26-27", "", "1", "navigate", "/collections/26-27"],
  ["Kulüpler", "clubs", "", "1", "expand", "/collections/clubs"],
  ["AC Milan", "ac-milan", "Kulüpler", "2", "navigate", "/collections/ac-milan"],
  ["Uluslar", "nations", "", "1", "expand", "/collections/nations"],
  ["Erkekler", "men", "", "1", "navigate", "/collections/men"],
  ["Kadınlar", "women", "", "1", "navigate", "/collections/women"],
  ["Yıldız oyuncu", "star-player", "", "1", "expand", "/collections/star-player"],
] as const;

export async function POST() {
  const menuMetrics: MenuMetricInput[] = [];
  const siteMetrics: SiteMetricInput[] = [];
  const today = new Date();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = date.toISOString().slice(0, 10);
    menus.forEach((menu, index) => {
      const base = 18 + ((13 - offset) * 3 + index * 11) % 42;
      for (const device of ["desktop", "mobile"] as const) {
        menuMetrics.push({
          date: dateKey,
          deviceCategory: device,
          menuName: menu[0],
          menuKey: menu[1],
          parentMenuName: menu[2],
          menuLevel: menu[3],
          menuAction: menu[4],
          navigationLocation: "header",
          clickTarget: menu[5],
          clickCount: Math.round(base * (device === "mobile" ? 0.72 : 1)),
        });
      }
    });
    const views = 720 + (13 - offset) * 29;
    siteMetrics.push(
      { date: dateKey, deviceCategory: "all", eventName: "page_view", eventCount: views, totalUsers: Math.round(views * 0.62) },
      { date: dateKey, deviceCategory: "all", eventName: "add_to_cart", eventCount: Math.round(views * 0.054) },
      { date: dateKey, deviceCategory: "all", eventName: "begin_checkout", eventCount: Math.round(views * 0.022) },
      { date: dateKey, deviceCategory: "all", eventName: "purchase", eventCount: Math.round(views * 0.011), totalRevenue: Math.round(views * 0.011 * 438) },
    );
  }
  const result = importDataset({
    source: "demo",
    period: { start: menuMetrics[0].date, end: menuMetrics.at(-1)?.date || menuMetrics[0].date },
    menuMetrics,
    siteMetrics,
    metadata: { purpose: "本地界面与分析链路验证" },
  });
  return NextResponse.json({ ok: true, ...result });
}
