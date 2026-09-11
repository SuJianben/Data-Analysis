"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { siteList } from "@/config/sites";
import { resolveSite } from "@/features/site-selection/site-selection";

const links = [
  { href: "/", label: "概览", short: "概", sub: "Overview" },
  { href: "/menus", label: "菜单分析", short: "菜", sub: "Menu Analytics" },
  { href: "/global-clicks", label: "全局埋点", short: "点", sub: "Click Tracking" },
  { href: "/users", label: "用户行为", short: "人", sub: "User Behavior" },
  { href: "/health", label: "数据健康", short: "检", sub: "Data Health" },
  { href: "/analysis", label: "AI 分析", short: "AI", sub: "AI Insights" },
];

function NavLinkContent({ short, label, sub }: { short: string; label: string; sub: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span className="nav-short" aria-hidden="true">{short}</span>
      <span className="nav-copy"><span className="nav-label">{label}</span><small className="nav-sub">{sub}</small></span>
      <span className="nav-chevron" aria-hidden="true">⌄</span>
      <span className={`nav-pending ${pending ? "is-visible" : ""}`} aria-hidden="true" />
    </>
  );
}

export function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSite = resolveSite(searchParams);
  const rangeQuery = new URLSearchParams();
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (startDate) rangeQuery.set("startDate", startDate);
  if (endDate) rangeQuery.set("endDate", endDate);
  rangeQuery.set("site", currentSite);
  return (
    <nav className="nav-list" aria-label="主导航">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const primaryHref = `${link.href}?${rangeQuery.toString()}`;
        return (
          <div className={`nav-group ${active ? "is-open" : ""}`} key={link.href}>
            <Link className={`nav-link ${active ? "is-active" : ""}`} href={primaryHref}>
              <NavLinkContent short={link.short} label={link.label} sub={link.sub} />
            </Link>
            {active && (
              <div className="nav-sites" aria-label={`${link.label}站点选择`}>
                {siteList.map((site) => {
                  const query = new URLSearchParams(rangeQuery);
                  query.set("site", site.key);
                  query.delete("tablePage");
                  query.delete("query");
                  query.delete("device");
                  return (
                    <Link
                      className={`nav-site-link ${site.key === currentSite ? "is-active" : ""}`}
                      href={`${link.href}?${query.toString()}`}
                      key={site.key}
                    >
                      <span>{site.shortLabel}</span>
                      <small>{site.label}</small>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
