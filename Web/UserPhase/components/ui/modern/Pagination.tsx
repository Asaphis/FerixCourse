import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxPageButtons?: number;
  className?: string;
  ariaLabel?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxPageButtons = 5,
  className = "",
  ariaLabel = "Pagination",
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const halfMax = Math.floor(maxPageButtons / 2);

  let start = Math.max(1, currentPage - halfMax);
  let end = Math.min(totalPages, start + maxPageButtons - 1);

  if (end - start + 1 < maxPageButtons) {
    start = Math.max(1, end - maxPageButtons + 1);
  }

  if (showFirstLast && start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (showFirstLast && end < totalPages) {
    if (end < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav className={`fc-pagination ${className}`.trim()} aria-label={ariaLabel}>
      <ul className="fc-pagination-list">
        {showPrevNext && (
          <li>
            <button
              type="button"
              className="fc-pagination-btn fc-pagination-prev"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <Icon name="chevronLeft" size={16} aria-hidden="true" />
            </button>
          </li>
        )}
        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <li key={`ellipsis-${index}`} className="fc-pagination-ellipsis">
              <span aria-hidden="true">…</span>
            </li>
          ) : (
            <li key={page}>
              <button
                type="button"
                className={`fc-pagination-btn ${page === currentPage ? "fc-pagination-current" : ""}`}
                onClick={() => onPageChange(page as number)}
                disabled={page === currentPage}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          )
        )}
        {showPrevNext && (
          <li>
            <button
              type="button"
              className="fc-pagination-btn fc-pagination-next"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <Icon name="chevronRight" size={16} aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};