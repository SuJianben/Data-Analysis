"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
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
      <span className={`nav-pending ${pending ? "is-visible" : ""}`} aria-hidden="true" />
    </>
  );
}

function NavGroups({ pathname, queryString, currentSite }: { pathname: string; queryString: string; currentSite: ReturnType<typeof resolveSite> }) {
  const activeHref = links.find((link) => link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))?.href || "/";
  const [expandedHref, setExpandedHref] = useState<string | null>(activeHref);

  return links.map((link) => {
    const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
    const expanded = expandedHref === link.href;
    const primaryHref = `${link.href}?${queryString}`;
    return (
      <div className={`nav-group ${expanded ? "is-open" : ""}`} key={link.href}>
        <div className="nav-primary-row">
          <Link
            className={`nav-link ${active ? "is-active" : ""}`}
            href={primaryHref}
            onClick={() => setExpandedHref(expanded && active ? null : link.href)}
          >
            <NavLinkContent short={link.short} label={link.label} sub={link.sub} />
          </Link>
          <button
            className="nav-toggle"
            type="button"
            aria-label={`${expanded ? "收起" : "展开"}${link.label}站点选择`}
            aria-expanded={expanded}
            onClick={() => setExpandedHref(expanded ? null : link.href)}
          >
            <span className="nav-chevron" aria-hidden="true">⌄</span>
          </button>
        </div>
        <div className="nav-sites-reveal" aria-hidden={!expanded}>
          <div className="nav-sites" aria-label={`${link.label}站点选择`}>
            {siteList.map((site) => {
              const query = new URLSearchParams(queryString);
              query.set("site", site.key);
              query.delete("tablePage");
              query.delete("query");
              query.delete("device");
              return (
                <Link
                  className={`nav-site-link ${site.key === currentSite ? "is-active" : ""}`}
                  href={`${link.href}?${query.toString()}`}
                  key={site.key}
                  tabIndex={expanded ? undefined : -1}
                >
                  <span className="nav-site-short">{site.shortLabel}</span>
                  <small className="nav-site-name">{site.label}</small>
                  {site.platform === "shopline" ? <span className="nav-platform">SHOPLINE</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  });
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
      <NavGroups key={pathname} pathname={pathname} queryString={rangeQuery.toString()} currentSite={currentSite} />
    </nav>
  );
}
