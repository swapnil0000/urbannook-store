import { useState, useEffect, useMemo } from "react";
import { PAGE_SIZE, STATUS_GROUPS } from "./managementConstants";

// Resolve the source field regardless of row shape
// (pending rows use `source`, shipment rows use `sourceOrderType`)
const rowSrc = (r) => r.source || r.sourceOrderType || "";

function applySearch(items, query) {
  if (!query.trim()) return items;
  const q = query.trim().toLowerCase();
  return items.filter((r) => {
    const name = (r.customerName || "").toLowerCase();
    const id   = (r.orderId || r.sourceOrderId || "").toLowerCase();
    return name.includes(q) || id.includes(q);
  });
}

/**
 * useTableState
 *
 * Manages per-table UI state:
 *   - text search (name or order ID)
 *   - source filter  ("all" | "WEBSITE" | "INSTAGRAM")
 *   - status filter  ("all" | "pickup" | "shipped" | "dispatched" | "delivered" | "issues")
 *   - pagination     (page 1-based, PAGE_SIZE rows per page)
 *
 * Returns the filtered+paged slice plus all setters so the table card
 * can render filter chips, search input, and pagination controls.
 */
export function useTableState(items) {
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [srcFilter,    setSrcFilter]    = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 1. Source + status filter
  const afterFilters = useMemo(() => {
    let arr = items;

    if (srcFilter !== "all") {
      arr = arr.filter((r) => rowSrc(r) === srcFilter);
    }

    if (statusFilter !== "all") {
      if (statusFilter === "dispatched") {
        arr = arr.filter((r) => !!r.dispatchConfirmedAt);
      } else {
        const group = STATUS_GROUPS[statusFilter] ?? [];
        arr = arr.filter((r) => group.includes(r.shipmentStatus));
      }
    }

    return arr;
  }, [items, srcFilter, statusFilter]);

  // 2. Text search on top of filters
  const filtered = useMemo(
    () => applySearch(afterFilters, search),
    [afterFilters, search],
  );

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setPage(1); }, [search, srcFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  return {
    // Setters
    search,       setSearch,
    srcFilter,    setSrcFilter,
    statusFilter, setStatusFilter,
    page: safePage, setPage,
    // Data
    paged,
    totalPages,
    total:         items.length,    // raw count (before any filter)
    totalFiltered: filtered.length, // count after all filters + search
  };
}
