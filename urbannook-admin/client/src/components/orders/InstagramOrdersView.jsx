import { useState } from "react";
import {
  Camera,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bell,
  Plus,
} from "lucide-react";
import { useInstagramOrders } from "../../hooks/useInstagramOrders";
import OrdersToolbar from "./OrdersToolbar";
import OrdersTable from "./OrdersTable";
import OrderDetailDrawer from "./OrderDetailDrawer";
import Pagination from "./Pagination";
import CreateOrderDrawer from "./CreateOrderDrawer";

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

  const [createOpen, setCreateOpen] = useState(false);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
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
      {/*   Sub-header     */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Manually entered orders from Instagram DMs
          </span>
          {loading && orders.length > 0 && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Order
          </button>
        </div>
      </div>

      {/*   New orders banner     */}
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          {hasActiveFilters ? (
            <>
              <p className="text-gray-500 font-medium">
                No orders match your filters
              </p>
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
              <p className="text-gray-500 font-medium">
                No Instagram orders yet
              </p>
              <p className="text-sm text-gray-400 mt-1 mb-4">
                Create the first order from an Instagram DM.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Order
              </button>
            </>
          )}
        </div>
      ) : (
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

      <OrderDetailDrawer order={selectedOrder} onClose={closeDrawer} />

      <CreateOrderDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
