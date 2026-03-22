import { useState } from "react";
import {
  Camera,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bell,
  Plus,
  QrCode,
} from "lucide-react";
import { useInstagramOrders } from "../../hooks/useInstagramOrders";
import OrdersToolbar from "./OrdersToolbar";
import OrdersTable from "./OrdersTable";
import OrderDetailDrawer from "./OrderDetailDrawer";
import Pagination from "./Pagination";
import CreateOrderDrawer from "./CreateOrderDrawer";
import IGPaymentLinkDrawer from "./IGPaymentLinkDrawer";

export default function InstagramOrdersView() {
  const {
    orders,
    loading,
    error,
    pagination,
    filters,
    sort,
    selectedOrder,
    pendingNewOrders,
    setPage,
    setFilters,
    resetFilters,
    setSort,
    selectOrder,
    closeDrawer,
    dismissPending,
    refetch,
  } = useInstagramOrders();

  const [createOpen, setCreateOpen]         = useState(false);
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <p className="font-medium mb-1" style={{ color: "var(--color-urban-text)" }}>Something went wrong</p>
        <p className="text-sm mb-4" style={{ color: "var(--color-urban-text-muted)" }}>{error}</p>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
          style={{ background: "var(--gradient-urban-accent)" }}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const hasActiveFilters =
    filters.status || filters.startDate || filters.endDate;
  const isEmpty = !loading && orders.length === 0;

  return (
    <>
      {/*   Sub-header     */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--color-urban-text-muted)" }}>
            Manually entered orders from Instagram DMs
          </span>
          {loading && orders.length > 0 && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{ color: "var(--color-urban-text-sec)", border: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setPaymentLinkOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all hover:opacity-90"
            style={{ border: "1px solid #f9a8d4", color: "#be185d", background: "#fdf2f8" }}
          >
            <QrCode className="h-3.5 w-3.5" />
            Send Payment Link
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90"
            style={{ background: "var(--gradient-urban-accent)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Order
          </button>
        </div>
      </div>

      {/*   New orders banner     */}
      {pendingNewOrders > 0 && (
        <div
          className="flex items-center justify-between text-sm rounded-xl px-4 py-2.5 mb-4"
          style={{ background: "color-mix(in srgb, var(--color-urban-neon) 10%, transparent)", border: "1px solid var(--color-urban-neon)" }}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: "var(--color-urban-neon)" }} />
            <span style={{ color: "var(--color-urban-text)" }}>
              {pendingNewOrders} new{" "}
              {pendingNewOrders === 1 ? "order" : "orders"} received
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPage(1);
                resetFilters();
                dismissPending();
              }}
              className="text-xs font-medium underline underline-offset-2 transition-colors"
              style={{ color: "var(--color-urban-neon)" }}
            >
              Go to latest
            </button>
            <button
              onClick={dismissPending}
              className="transition-colors text-xs"
              style={{ color: "var(--color-urban-text-muted)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <OrdersToolbar
        filters={filters}
        sort={sort}
        totalOrders={pagination.totalOrders}
        loading={loading}
        onFilterChange={setFilters}
        onSortChange={setSort}
        onReset={resetFilters}
      />

      {isEmpty ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)" }}
        >
          <Camera className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--color-urban-border)" }} />
          {hasActiveFilters ? (
            <>
              <p className="font-medium" style={{ color: "var(--color-urban-text-sec)" }}>
                No orders match your filters
              </p>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--color-urban-text-muted)" }}>
                Try adjusting or clearing your filter criteria.
              </p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                style={{ background: "var(--gradient-urban-accent)" }}
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="font-medium" style={{ color: "var(--color-urban-text-sec)" }}>
                No Instagram orders yet
              </p>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--color-urban-text-muted)" }}>
                Create the first order from an Instagram DM.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all hover:opacity-90 text-sm font-medium"
                style={{ background: "var(--gradient-urban-accent)" }}
              >
                <Plus className="h-4 w-4" />
                Create Order
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)" }}
        >
          <OrdersTable
            orders={orders}
            sort={sort}
            selectedOrder={selectedOrder}
            onSort={setSort}
            onSelectOrder={selectOrder}
          />
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalOrders={pagination.totalOrders}
            limit={pagination.limit}
            onPageChange={setPage}
          />
        </div>
      )}

      <OrderDetailDrawer order={selectedOrder} onClose={closeDrawer} />

      <CreateOrderDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <IGPaymentLinkDrawer
        open={paymentLinkOpen}
        onClose={() => setPaymentLinkOpen(false)}
        onCreated={refetch}
      />
    </>
  );
}
