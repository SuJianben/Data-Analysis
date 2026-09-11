"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatNumber } from "@/utils/format";

const DEVICES = ["all", "desktop", "mobile", "tablet"] as const;

type GlobalClickControlsProps = {
  query: string;
  device: string;
  totalClicks: number;
};

export function GlobalClickControls({ query, device, totalClicks }: GlobalClickControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(query);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setSearch(query), [query]);

  function navigate(next: { query?: string; device?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = next.query === undefined ? search.trim() : next.query.trim();
    const nextDevice = next.device === undefined ? device : next.device;
    if (nextQuery) params.set("query", nextQuery);
    else params.delete("query");
    if (nextDevice !== "all") params.set("device", nextDevice);
    else params.delete("device");
    params.delete("tablePage");
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    if (search.trim() === query) return;
    const timer = window.setTimeout(() => navigate({ query: search }), 350);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ query: search });
  }

  return (
    <div className="table-tools">
      <form className="search-field" onSubmit={submit}>
        <span>筛选点击</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="页面、元素或跳转路径" />
      </form>
      <div className="segmented" aria-label="设备筛选">
        {DEVICES.map((value) => (
          <button
            className={device === value ? "is-active" : ""}
            disabled={isPending}
            onClick={() => navigate({ device: value })}
            type="button"
            key={value}
          >
            {value === "all" ? "全部" : value}
          </button>
        ))}
      </div>
      <span className="table-total">合计 {formatNumber(totalClicks)} 次</span>
    </div>
  );
}
