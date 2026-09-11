"use client";

import { useSearchParams } from "next/navigation";
import { sites } from "@/config/sites";
import { resolveSite } from "@/features/site-selection/site-selection";

export function SiteBreadcrumb() {
  const site = sites[resolveSite(useSearchParams())];
  return <span className="eyebrow">{site.shortLabel} / {site.domain} / ANALYTICS</span>;
}
