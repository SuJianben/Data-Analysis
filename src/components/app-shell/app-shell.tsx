import Link from "next/link";
import { Suspense } from "react";
import { DateRangeFilter } from "@/components/app-shell/date-range-filter";
import { NavLinks } from "@/components/app-shell/nav-links";
import { SiteBreadcrumb } from "@/components/app-shell/site-breadcrumb";
import { RouteMotion } from "@/components/motion/route-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const usesLocalPrimary = process.env.ANALYTICS_READ_MODE === "local" || !process.env.USER_EVENT_API_URL?.trim();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="多站点数据分析首页">
          <span className="brand-mark" aria-hidden="true">◈</span>
          <span className="brand-copy"><strong>多站点数据分析</strong><small>数据分析工作台</small></span>
        </Link>
        <Suspense fallback={<nav className="nav-list" aria-label="主导航" />}><NavLinks /></Suspense>
        <div className="sidebar-foot">
          <span className="status-dot" />
          <div>
            <strong>{usesLocalPrimary ? "本地主数据库" : "迁移兼容模式"}</strong>
            <small>{usesLocalPrimary ? "Vercel 接收 · 自动同步" : "Cloudflare 读取兼容中"}</small>
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div>
            <Suspense fallback={<span className="eyebrow">SITE / ANALYTICS</span>}><SiteBreadcrumb /></Suspense>
          </div>
          <Suspense fallback={<span className="date-range-loading">加载时间范围…</span>}>
            <DateRangeFilter />
          </Suspense>
        </header>
        <main>
          <Suspense fallback={<div className="route-motion-frame">{children}</div>}>
            <RouteMotion>{children}</RouteMotion>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
