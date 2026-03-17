import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bell,
} from "lucide-react";
import { useOrders } from "../hooks/useOrders";
import OrdersToolbar from "../components/orders/OrdersToolbar";
import OrdersTable from "../components/orders/OrdersTable";
import OrderDetailDrawer from "../components/orders/OrderDetailDrawer";
import Pagination from "../components/orders/Pagination";

export default function Orders() {
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
  } = useOrders();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && orders.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Error state (only when there's nothing cached to show) ────────────────
  if (error && orders.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">Something went wrong</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
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
      <div className="p-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            {/* Subtle loading indicator during background re-fetches */}
            {loading && orders.length > 0 && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh orders"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* ── New orders banner (shown when real-time order arrives off-page) ── */}
        {pendingNewOrders > 0 && (
          <div className="flex items-center justify-between bg-gray-900 text-white text-sm rounded-lg px-4 py-2.5 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-300" />
              <span>
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
                className="text-xs font-medium underline underline-offset-2 hover:text-gray-300 transition-colors"
              >
                Go to latest
              </button>
              <button
                onClick={dismissPending}
                className="text-gray-400 hover:text-white transition-colors text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <OrdersToolbar
          filters={filters}
          sort={sort}
          totalOrders={pagination.totalOrders}
          loading={loading}
          onFilterChange={setFilters}
          onSortChange={setSort}
          onReset={resetFilters}
        />

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {isEmpty ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            {hasActiveFilters ? (
              <>
                <p className="text-gray-500 font-medium">No orders match your filters</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  Try adjusting or clearing your filter criteria.
                </p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500 font-medium">No orders yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Customer orders will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          /* ── Orders table ─────────────────────────────────────────────── */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
      </div>

      {/* ── Detail drawer — rendered at page level to overlay correctly ─── */}
      <OrderDetailDrawer order={selectedOrder} onClose={closeDrawer} />
    </>
  );
}
