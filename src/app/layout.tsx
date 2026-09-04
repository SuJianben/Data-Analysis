import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell/app-shell";

export const metadata: Metadata = {
  title: "TKF Signal · 本地数据分析",
  description: "TurkForma 本地数据同步、菜单报表与 AI 分析工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
