import { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, X } from "lucide-react";

const STATUSES = ["PAID", "CREATED", "FAILED"];

const SORT_OPTIONS = [
  { label: "Newest first", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Oldest first", sortBy: "createdAt", sortOrder: "asc" },
  { label: "Amount: high → low", sortBy: "amount", sortOrder: "desc" },
  { label: "Amount: low → high", sortBy: "amount", sortOrder: "asc" },
];

/**
 * Toolbar for filters (status, date range) and sort controls.
 * Date inputs use local state to avoid triggering a fetch on every keystroke
 * (browsers fire onChange once the full date is selected, but we debounce anyway
 * to guard against programmatic input).
 */
export default function OrdersToolbar({
  filters,
  sort,
  totalOrders,
  loading,
  onFilterChange,
  onSortChange,
  onReset,
}) {
  // Local date state — avoids calling onFilterChange on every partial date input
  const [localStartDate, setLocalStartDate] = useState(filters.startDate);
  const [localEndDate, setLocalEndDate] = useState(filters.endDate);

  // Keep local dates in sync when filters are reset externally
  useEffect(() => {
    setLocalStartDate(filters.startDate);
  }, [filters.startDate]);

  useEffect(() => {
    setLocalEndDate(filters.endDate);
  }, [filters.endDate]);

  // Debounce date changes — 350ms gives the browser's date picker time to commit
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only propagate if the value actually changed from what the parent knows
      if (
        localStartDate !== filters.startDate ||
        localEndDate !== filters.endDate
      ) {
        // Client-side guard: warn if start > end (backend also handles this)
        if (localStartDate && localEndDate && localStartDate > localEndDate) {
          return; // silently skip — the user is still editing
        }
        onFilterChange({ startDate: localStartDate, endDate: localEndDate });
      }
    }, 350);

    return () => clearTimeout(timer);
    // Intentionally not including filters.startDate / filters.endDate in deps
    // to avoid a circular update loop (parent sets filter → effect fires → parent sets filter…)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStartDate, localEndDate]);

  // Build the current sort option label for the dropdown
  const currentSortValue = `${sort.sortBy}:${sort.sortOrder}`;

  const handleSortChange = useCallback(
    (e) => {
      const [sortBy, sortOrder] = e.target.value.split(":");
      onSortChange({ sortBy, sortOrder });
    },
    [onSortChange]
  );

  const hasActiveFilters =
    filters.status || filters.startDate || filters.endDate;

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Icon + result count */}
        <div className="flex items-center gap-2 mr-auto">
          <SlidersHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500">
            {loading ? (
              "Loading…"
            ) : (
              <>
                <span className="font-semibold text-gray-800">{totalOrders}</span>{" "}
                {totalOrders === 1 ? "order" : "orders"}
              </>
            )}
          </span>
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            max={localEndDate || undefined}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            aria-label="Start date"
          />
          <span className="text-gray-400 text-sm">→</span>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            min={localStartDate || undefined}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            aria-label="End date"
          />
        </div>

        {/* Sort */}
        <select
          value={currentSortValue}
          onChange={handleSortChange}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer"
          aria-label="Sort orders"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={`${opt.sortBy}:${opt.sortOrder}`} value={`${opt.sortBy}:${opt.sortOrder}`}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Clear filters — only visible when a filter is active */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Clear all filters"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
