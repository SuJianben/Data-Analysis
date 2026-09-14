"use client";

import { usePathname, useSearchParams } from "next/navigation";

export function RouteMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contextKey = ["site", "startDate", "endDate"]
    .map((key) => `${key}=${searchParams.get(key) || ""}`)
    .join("&");
  const motionKey = `${pathname}?${contextKey}`;

  return <div className="route-motion-frame" key={motionKey}>{children}</div>;
}
