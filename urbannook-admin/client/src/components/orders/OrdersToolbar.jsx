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
  showChannelFilter = false,
  shipmentFilter = "all",
  onShipmentFilterChange,
  dispatchFilter = "all",
  onDispatchFilterChange,
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
    [onSortChange],
  );

  const hasActiveFilters =
    filters.status ||
    filters.startDate ||
    filters.endDate ||
    (showChannelFilter && filters.channel && filters.channel !== "all") ||
    (shipmentFilter && shipmentFilter !== "all") ||
    (dispatchFilter && dispatchFilter !== "all");

  const inputStyle = {
    border: "1px solid var(--color-urban-border)",
    color: "var(--color-urban-text)",
    background: "var(--color-urban-raised)",
  };

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: "var(--color-urban-surface)",
        border: "1px solid var(--color-urban-border)",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Icon + result count */}
        <div className="flex items-center gap-2 mr-auto">
          <SlidersHorizontal className="h-4 w-4 shrink-0" style={{ color: "var(--color-urban-text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
            {loading ? (
              "Loading…"
            ) : (
              <>
                <span className="font-semibold" style={{ color: "var(--color-urban-text)" }}>
                  {totalOrders}
                </span>{" "}
                {totalOrders === 1 ? "order" : "orders"}
              </>
            )}
          </span>
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className="text-sm rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          style={inputStyle}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Channel filter — unified view only */}
        {showChannelFilter && (
          <select
            value={filters.channel || "all"}
            onChange={(e) => onFilterChange({ channel: e.target.value })}
            className="text-sm rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
            style={inputStyle}
            aria-label="Filter by channel"
          >
            <option value="all">All channels</option>
            <option value="website">Website only</option>
            <option value="instagram">Instagram only</option>
          </select>
        )}

        {/* Shipment filter */}
        {onShipmentFilterChange && (
          <select
            value={shipmentFilter}
            onChange={(e) => onShipmentFilterChange(e.target.value)}
            className="text-sm rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
            style={inputStyle}
            aria-label="Filter by shipment"
          >
            <option value="all">All shipments</option>
            <option value="shipped">Shipped</option>
            <option value="not_shipped">Not shipped</option>
          </select>
        )}

        {/* Dispatch filter */}
        {onDispatchFilterChange && (
          <select
            value={dispatchFilter}
            onChange={(e) => onDispatchFilterChange(e.target.value)}
            className="text-sm rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
            style={inputStyle}
            aria-label="Filter by dispatch"
          >
            <option value="all">All dispatches</option>
            <option value="dispatched">Dispatched</option>
            <option value="not_dispatched">Not dispatched</option>
          </select>
        )}

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            max={localEndDate || undefined}
            className="text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            style={inputStyle}
            aria-label="Start date"
          />
          <span className="text-sm" style={{ color: "var(--color-urban-text-muted)" }}>→</span>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            min={localStartDate || undefined}
            className="text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            style={inputStyle}
            aria-label="End date"
          />
        </div>

        {/* Sort */}
        <select
          value={currentSortValue}
          onChange={handleSortChange}
          className="text-sm rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          style={inputStyle}
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
            className="inline-flex items-center gap-1 text-sm transition-colors"
            style={{ color: "#ef4444" }}
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
