import { useState, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ClipboardList, Loader2, AlertCircle, RefreshCw, Instagram, Globe } from "lucide-react";
import {
  selectWebsiteOrders,
  selectInstagramOrders,
  selectOrdersLoading,
  selectOrdersError,
  fetchWebsiteOrders,
  fetchInstagramOrders,
} from "../store/ordersSlice";

const PAGE_LIMIT = 30;

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function productSummary(items = []) {
  if (!items.length) return "—";
  return items
    .map((item) => {
      const name = item.productSnapshot?.productName || "Product";
      const qty  = item.productSnapshot?.quantity || 1;
      return qty > 1 ? `${name} ×${qty}` : name;
    })
    .join(", ");
}

// ── sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  if (source === "instagram") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ background: "#fce7f3", color: "#9d174d" }}
      >
        <Instagram className="h-2.5 w-2.5" />IG
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: "#dbeafe", color: "#1e40af" }}
    >
      <Globe className="h-2.5 w-2.5" />WS
    </span>
  );
}

function PaginationBar({ currentPage, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * PAGE_LIMIT + 1;
  const end   = Math.min(currentPage * PAGE_LIMIT, total);
  return (
    <div
      className="flex items-center justify-between px-4 py-3 text-sm"
      style={{ borderTop: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-muted)" }}
    >
      <span>{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 rounded-lg transition-colors disabled:opacity-30"
          style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
        >Prev</button>
        <span className="px-2" style={{ color: "var(--color-urban-text)" }}>{currentPage} / {totalPages}</span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 rounded-lg transition-colors disabled:opacity-30"
          style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
        >Next</button>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Management() {
  const dispatch   = useDispatch();
  const website    = useSelector(selectWebsiteOrders);
  const instagram  = useSelector(selectInstagramOrders);
  const loading    = useSelector(selectOrdersLoading);
  const error      = useSelector(selectOrdersError);

  const [page, setPage] = useState(1);

  // Filter to PAID only + sort newest-first — pure derivation from Redux data
  const paidOrders = useMemo(() => {
    return [...website, ...instagram]
      .filter((o) => o.status === "PAID")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [website, instagram]);

  const totalPages   = Math.max(1, Math.ceil(paidOrders.length / PAGE_LIMIT));
  const safePage     = Math.min(page, totalPages);
  const pageOrders   = paidOrders.slice((safePage - 1) * PAGE_LIMIT, safePage * PAGE_LIMIT);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refetch = useCallback(() => {
    dispatch(fetchWebsiteOrders());
    dispatch(fetchInstagramOrders());
  }, [dispatch]);

  // ── loading state (no cached data yet) ────────────────────────────────────
  if (loading && paidOrders.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-urban-text">Management</h1>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-urban-neon" />
        </div>
      </div>
    );
  }

  if (error && paidOrders.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-urban-text">Management</h1>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="font-semibold text-urban-text">Something went wrong</p>
          <p className="text-sm text-urban-text-sec">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white
                       bg-linear-to-br from-urban-accent-from to-urban-accent-to hover:brightness-110 transition-all"
          >
            <RefreshCw className="h-4 w-4" />Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-urban-text">Management</h1>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-urban-neon" />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-urban-text-muted">{paidOrders.length} paid orders</span>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg
                       border border-urban-border bg-urban-raised text-urban-text-sec
                       hover:border-urban-neon hover:text-urban-neon transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </button>
        </div>
      </div>

      {/* Filter tag */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "#dcfce7", color: "#15803d" }}
        >PAID</span>
        <span className="text-xs text-urban-text-muted">Website + Instagram · derived from global store</span>
      </div>

      {/* Table */}
      {paidOrders.length === 0 ? (
        <div className="un-card p-12 text-center">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-urban-border" />
          <p className="font-semibold text-urban-text">No paid orders yet</p>
          <p className="text-sm mt-1 text-urban-text-sec">
            Paid orders from both website and Instagram will appear here.
          </p>
        </div>
      ) : (
        <div className="un-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}>
                {["Order ID", "Customer", "Date", "Products"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-urban-text-muted)" }}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageOrders.map((order, idx) => (
                <tr
                  key={order.orderId ?? order._id}
                  style={{ borderBottom: idx < pageOrders.length - 1 ? "1px solid var(--color-urban-border)" : "none" }}
                  className="hover:bg-urban-neon/5 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <SourceBadge source={order._channel} />
                      <span className="font-mono text-xs font-semibold" style={{ color: "var(--color-urban-text)" }}>
                        {order.orderId}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium" style={{ color: "var(--color-urban-text)" }}>
                      {order.customerName || order.userName || `User ${(order.userId || "").slice(-6)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--color-urban-text-sec)" }}>
                    {formatDate(order._channel === "instagram" ? (order.orderedAt || order.createdAt) : order.createdAt)}
                  </td>
                  <td className="px-4 py-3 max-w-xs" style={{ color: "var(--color-urban-text-sec)" }}>
                    <span className="line-clamp-2 text-xs leading-relaxed">{productSummary(order.items)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar
            currentPage={safePage}
            totalPages={totalPages}
            total={paidOrders.length}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
