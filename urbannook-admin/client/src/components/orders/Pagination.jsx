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

export default function Pagination({
  currentPage,
  totalPages,
  totalOrders,
  limit,
  onPageChange,
}) {
  // Derive a safe totalPages: prefer server value, but recalculate if it looks
  // wrong (e.g. server returned 1 but we know there are more items than a page holds).
  const safeTotalPages =
    totalPages > 1
      ? totalPages
      : totalOrders > limit
        ? Math.ceil(totalOrders / limit)
        : totalPages;

  // Don't render the control at all when there's only one page
  if (safeTotalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, safeTotalPages);

  // Calculate the visible range of items for the summary line
  const rangeStart = (currentPage - 1) * limit + 1;
  const rangeEnd = Math.min(currentPage * limit, totalOrders);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
      style={{ borderTop: "1px solid var(--color-urban-border)" }}
    >
      <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
        Showing{" "}
        <span className="font-semibold" style={{ color: "var(--color-urban-text)" }}>{rangeStart}</span>–
        <span className="font-semibold" style={{ color: "var(--color-urban-text)" }}>{rangeEnd}</span>{" "}
        of{" "}
        <span className="font-semibold" style={{ color: "var(--color-urban-text)" }}>{totalOrders}</span>
      </p>

      <div className="flex items-center gap-1" role="navigation" aria-label="Pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((page, idx) =>
          page === "…" ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-9 h-9 flex items-center justify-center text-sm"
              style={{ color: "var(--color-urban-text-muted)" }}
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
              className="w-9 h-9 text-sm rounded-lg transition-colors"
              style={
                page === currentPage
                  ? { background: "var(--color-urban-neon)", color: "#111", border: "1px solid var(--color-urban-neon)", cursor: "default", fontWeight: 700 }
                  : { border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }
              }
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === safeTotalPages}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
