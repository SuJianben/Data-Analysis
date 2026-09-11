"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { defaultDateRange, resolveDateRange, shiftIsoDate } from "@/features/date-range/date-range";

const presets = [
  { label: "7天", days: 7 },
  { label: "30天", days: 30 },
  { label: "90天", days: 90 },
];

export function DateRangeFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = resolveDateRange({
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
  });
  const [startDate, setStartDate] = useState(current.startDate);
  const [endDate, setEndDate] = useState(current.endDate);
  const [error, setError] = useState("");

  useEffect(() => {
    setStartDate(current.startDate);
    setEndDate(current.endDate);
  }, [current.endDate, current.startDate]);

  if (pathname === "/health") {
    return <span className="health-window-note">固定检查最近7个完整自然日</span>;
  }

  function navigate(nextStart: string, nextEnd: string) {
    if (!nextStart || !nextEnd || nextStart > nextEnd) {
      setError("开始日期不能晚于结束日期");
      return;
    }
    const query = new URLSearchParams(searchParams.toString());
    query.set("startDate", nextStart);
    query.set("endDate", nextEnd);
    query.delete("tablePage");
    setError("");
    router.push(`${pathname}?${query.toString()}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(startDate, endDate);
  }

  function applyPreset(days: number) {
    const end = defaultDateRange().endDate;
    const start = shiftIsoDate(end, -(days - 1));
    setStartDate(start);
    setEndDate(end);
    navigate(start, end);
  }

  return (
    <form className="date-range-filter" onSubmit={submit} aria-label="数据时间范围">
      <div className="date-presets" aria-label="快捷时间范围">
        {presets.map((preset) => (
          <button type="button" key={preset.days} onClick={() => applyPreset(preset.days)}>
            {preset.label}
          </button>
        ))}
      </div>
      <label><span>开始</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <i aria-hidden="true">—</i>
      <label><span>结束</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      <button className="date-apply" type="submit">应用</button>
      {error && <span className="date-range-error" role="alert">{error}</span>}
    </form>
  );
}
