"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "概览", short: "概" },
  { href: "/menus", label: "菜单分析", short: "菜" },
  { href: "/global-clicks", label: "全局埋点", short: "点" },
  { href: "/sources", label: "数据源", short: "源" },
  { href: "/analysis", label: "AI 分析", short: "AI" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav-list" aria-label="主导航">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link className={`nav-link ${active ? "is-active" : ""}`} href={link.href} key={link.href}>
            <span className="nav-short" aria-hidden="true">{link.short}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
