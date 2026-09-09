"use client";

type PaginationProps = {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalItems, pageSize = 20, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className="pagination" aria-label="数据分页">
      <span>显示 {firstItem}-{lastItem} 条，共 {totalItems} 条</span>
      <div className="pagination-controls">
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>上一页</button>
        <strong>第 {currentPage} / {totalPages} 页</strong>
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>下一页</button>
      </div>
    </nav>
  );
}
