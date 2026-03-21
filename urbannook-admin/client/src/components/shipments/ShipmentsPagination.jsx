import { ChevronLeft, ChevronRight } from "lucide-react";

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

const LIMIT = 20;

export default function ShipmentsPagination({ currentPage, totalPages, totalRecords, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const rangeStart  = (currentPage - 1) * LIMIT + 1;
  const rangeEnd    = Math.min(currentPage * LIMIT, totalRecords);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 mt-3 rounded-xl"
      style={{
        border: "1px solid var(--color-urban-border)",
        background: "var(--color-urban-surface)",
      }}
    >
      <p className="text-xs" style={{ color: "var(--color-urban-text-sec)" }}>
        Showing{" "}
        <span style={{ color: "var(--color-urban-text)" }}>{rangeStart}</span>–
        <span style={{ color: "var(--color-urban-text)" }}>{rangeEnd}</span>{" "}
        of <span style={{ color: "var(--color-urban-text)" }}>{totalRecords}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((page, idx) =>
          page === "…" ? (
            <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs" style={{ color: "var(--color-urban-text-muted)" }}>…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
              className="w-8 h-8 text-xs rounded-lg transition-colors flex items-center justify-center"
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
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
