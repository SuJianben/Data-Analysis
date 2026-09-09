import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell/app-shell";

export const metadata: Metadata = {
  title: "TKF Signal · 站点数据分析",
  description: "TurkForma 数据同步、菜单报表、用户行为与 AI 分析工作台",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
