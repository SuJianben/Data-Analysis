"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PaginationMeta } from "@/types/analytics";

export function ServerPagination({ pagination, pageParam = "tablePage" }: { pagination: PaginationMeta; pageParam?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const firstItem = pagination.totalItems ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  function navigate(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(pageParam);
    else params.set(pageParam, String(page));
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <nav className="pagination" aria-label="数据分页" aria-busy={isPending}>
      <span>显示 {firstItem}-{lastItem} 条，共 {pagination.totalItems} 条</span>
      <div className="pagination-controls">
        <button type="button" onClick={() => navigate(pagination.page - 1)} disabled={pagination.page === 1 || isPending}>上一页</button>
        <strong>第 {pagination.page} / {pagination.totalPages} 页</strong>
        <button type="button" onClick={() => navigate(pagination.page + 1)} disabled={pagination.page === pagination.totalPages || isPending}>下一页</button>
      </div>
    </nav>
  );
}
