"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PaginationMeta } from "@/types/analytics";

export function ServerPagination({ pagination, pageParam = "tablePage" }: { pagination: PaginationMeta; pageParam?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [targetPage, setTargetPage] = useState(String(pagination.page));
  const firstItem = pagination.totalItems ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  useEffect(() => {
    setTargetPage(String(pagination.page));
  }, [pagination.page]);

  function navigate(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(pageParam);
    else params.set(pageParam, String(page));
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requested = Number.parseInt(targetPage, 10);
    if (!Number.isFinite(requested)) {
      setTargetPage(String(pagination.page));
      return;
    }
    const nextPage = Math.min(Math.max(requested, 1), pagination.totalPages);
    setTargetPage(String(nextPage));
    navigate(nextPage);
  }

  return (
    <nav className="pagination" aria-label="数据分页" aria-busy={isPending}>
      <span>显示 {firstItem}-{lastItem} 条，共 {pagination.totalItems} 条</span>
      <div className="pagination-controls">
        <button type="button" onClick={() => navigate(pagination.page - 1)} disabled={pagination.page === 1 || isPending}>上一页</button>
        <strong>第 {pagination.page} / {pagination.totalPages} 页</strong>
        <button type="button" onClick={() => navigate(pagination.page + 1)} disabled={pagination.page === pagination.totalPages || isPending}>下一页</button>
        <form className="pagination-jump" onSubmit={submitPage}>
          <label htmlFor={`${pageParam}-jump`}>跳至</label>
          <input
            id={`${pageParam}-jump`}
            type="number"
            min="1"
            max={pagination.totalPages}
            inputMode="numeric"
            value={targetPage}
            onChange={(event) => setTargetPage(event.target.value)}
            disabled={isPending}
            aria-label="输入页码"
          />
          <span>页</span>
          <button type="submit" disabled={isPending}>跳转</button>
        </form>
      </div>
    </nav>
  );
}
