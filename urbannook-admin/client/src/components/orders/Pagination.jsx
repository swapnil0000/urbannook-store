import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Generates a page number sequence with ellipsis for large page counts.
 * Always shows: first page, last page, current page, and 1 neighbour on each side.
 * Gaps larger than 1 are collapsed into "…".
 */
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  // Remove out-of-range values
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  // Insert "…" where there are gaps > 1
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("…");
    }
    result.push(sorted[i]);
  }

  return result;
}

export default function Pagination({ currentPage, totalPages, totalOrders, limit, onPageChange }) {
  // Don't render the control at all when there's only one page
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  // Calculate the visible range of items for the summary line
  const rangeStart = (currentPage - 1) * limit + 1;
  const rangeEnd = Math.min(currentPage * limit, totalOrders);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-gray-200">
      {/* Result range summary */}
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-gray-800">{rangeStart}</span>–
        <span className="font-medium text-gray-800">{rangeEnd}</span> of{" "}
        <span className="font-medium text-gray-800">{totalOrders}</span>
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) =>
          page === "…" ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-9 h-9 flex items-center justify-center text-sm text-gray-400"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
              className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                page === currentPage
                  ? "bg-gray-900 text-white border-gray-900 cursor-default"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
