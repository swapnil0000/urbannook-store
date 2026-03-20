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

  const btnBase   = "w-8 h-8 text-xs rounded-lg border transition-colors flex items-center justify-center";
  const btnActive = "bg-white text-black border-white cursor-default";
  const btnIdle   = "text-gray-400 hover:text-white border-[#333] hover:border-[#555]";
  const btnNav    = "p-1.5 rounded-lg border border-[#333] text-gray-500 hover:text-white hover:border-[#555] disabled:opacity-30 disabled:cursor-not-allowed transition-colors";

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 mt-3 rounded-xl border"
      style={{ borderColor: "#2A2A2A", backgroundColor: "#1A1A1A" }}
    >
      <p className="text-xs text-gray-500">
        Showing <span className="text-gray-300">{rangeStart}</span>–
        <span className="text-gray-300">{rangeEnd}</span> of{" "}
        <span className="text-gray-300">{totalRecords}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={btnNav}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((page, idx) =>
          page === "…" ? (
            <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs text-gray-600">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
              className={`${btnBase} ${page === currentPage ? btnActive : btnIdle}`}
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
          className={btnNav}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
