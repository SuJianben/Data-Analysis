"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const links = [
  { href: "/", label: "概览", short: "概" },
  { href: "/menus", label: "菜单分析", short: "菜" },
  { href: "/global-clicks", label: "全局埋点", short: "点" },
  { href: "/users", label: "用户行为", short: "人" },
  { href: "/health", label: "数据健康", short: "检" },
  { href: "/analysis", label: "AI 分析", short: "AI" },
];

function NavLinkContent({ short, label }: { short: string; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span className="nav-short" aria-hidden="true">{short}</span>
      <span className="nav-label">{label}</span>
      <span className={`nav-pending ${pending ? "is-visible" : ""}`} aria-hidden="true" />
    </>
  );
}

export function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rangeQuery = new URLSearchParams();
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (startDate) rangeQuery.set("startDate", startDate);
  if (endDate) rangeQuery.set("endDate", endDate);
  const suffix = rangeQuery.size ? `?${rangeQuery.toString()}` : "";
  return (
    <nav className="nav-list" aria-label="主导航">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link className={`nav-link ${active ? "is-active" : ""}`} href={`${link.href}${suffix}`} key={link.href}>
            <NavLinkContent short={link.short} label={link.label} />
          </Link>
        );
      })}
    </nav>
  );
}
