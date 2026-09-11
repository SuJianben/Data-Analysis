import Link from "next/link";
import { Suspense } from "react";
import { DateRangeFilter } from "@/components/app-shell/date-range-filter";
import { NavLinks } from "@/components/app-shell/nav-links";
import { SiteBreadcrumb } from "@/components/app-shell/site-breadcrumb";

export function AppShell({ children }: { children: React.ReactNode }) {
  const usesCloudflare = Boolean(process.env.USER_EVENT_API_URL?.trim());

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="多站点数据分析首页">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>多站点数据分析</strong><small>数据分析工作台</small></span>
        </Link>
        <Suspense fallback={<nav className="nav-list" aria-label="主导航" />}><NavLinks /></Suspense>
        <div className="sidebar-foot">
          <span className="status-dot" />
          <div>
            <strong>{usesCloudflare ? "Cloudflare D1" : "本机数据库"}</strong>
            <small>{usesCloudflare ? "云端数据已连接" : "本机数据已连接"}</small>
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
        <main>{children}</main>
      </div>
    </div>
  );
}
