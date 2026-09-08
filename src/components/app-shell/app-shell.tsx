import Link from "next/link";
import { NavLinks } from "@/components/app-shell/nav-links";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="TKF Signal 首页">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>TKF Signal</strong><small>本地数据分析</small></span>
        </Link>
        <NavLinks />
        <div className="sidebar-foot">
          <span className="status-dot" />
          <div><strong>本机数据库</strong><small>数据不会公开上传</small></div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">TURKFORMA / ANALYTICS</span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
