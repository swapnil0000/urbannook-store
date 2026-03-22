import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bell,
  Plus,
} from "lucide-react";
import { useAllOrders } from "../hooks/useAllOrders";
import OrdersToolbar from "../components/orders/OrdersToolbar";
import OrdersTable from "../components/orders/OrdersTable";
import OrderDetailDrawer from "../components/orders/OrderDetailDrawer";
import Pagination from "../components/orders/Pagination";
import CreateOrderDrawer from "../components/orders/CreateOrderDrawer";
import { useEnv } from "../context/EnvContext";
import apiClient from "../api/axios";

export default function Orders() {
  const { refreshKey } = useEnv();

  const [createOpen, setCreateOpen] = useState(false);

  // ── Shipped order IDs ────────────────────────────────────────────────────
  const [shippedOrderIds, setShippedOrderIds] = useState(new Set());
  useEffect(() => {
    apiClient
      .get("/admin/shipmozo/shipped-order-ids")
      .then((res) => setShippedOrderIds(new Set(res.data.data ?? [])))
      .catch(() => {});
  }, []);

  // ── Dispatched order IDs ──────────────────────────────────────────────────
  const [dispatchedOrderIds, setDispatchedOrderIds] = useState(new Set());
  useEffect(() => {
    apiClient
      .get("/admin/dispatch/order-ids")
      .then((res) => setDispatchedOrderIds(new Set(res.data.data ?? [])))
      .catch(() => {});
  }, []);

  const handleDispatch = (orderId, orderType) => {
    apiClient
      .post(`/admin/dispatch/${orderId}`, { orderType })
      .then(() => setDispatchedOrderIds((prev) => new Set([...prev, orderId])))
      .catch(() => {});
  };

  // ── Shipment + Dispatch filters + Search ─────────────────────────────────
  // Initialised from sessionStorage so filters survive navigation.
  // Declared before useAllOrders so they can be passed in — filtering happens
  // inside the hook before pagination so all 500 orders are searched/filtered.
  const [shipmentFilter, setShipmentFilter] = useState(
    () => { try { return sessionStorage.getItem("orders_shipmentFilter") ?? "all"; } catch { return "all"; } },
  );
  const [dispatchFilter, setDispatchFilter] = useState(
    () => { try { return sessionStorage.getItem("orders_dispatchFilter") ?? "all"; } catch { return "all"; } },
  );
  const [searchQuery, setSearchQuery] = useState(
    () => { try { return sessionStorage.getItem("orders_searchQuery") ?? ""; } catch { return ""; } },
  );

  useEffect(() => { try { sessionStorage.setItem("orders_shipmentFilter", shipmentFilter); } catch {} }, [shipmentFilter]);
  useEffect(() => { try { sessionStorage.setItem("orders_dispatchFilter", dispatchFilter); } catch {} }, [dispatchFilter]);
  useEffect(() => { try { sessionStorage.setItem("orders_searchQuery",    searchQuery);    } catch {} }, [searchQuery]);

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
  } = useAllOrders({
    refreshKey,
    searchQuery,
    shipmentFilter,
    shippedOrderIds,
    dispatchFilter,
    dispatchedOrderIds,
  });

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-urban-text">
          Orders
        </h1>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-urban-neon" />
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-urban-text">
          Orders
        </h1>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <div>
            <p className="font-semibold text-urban-text">
              Something went wrong
            </p>
            <p className="text-sm mt-1 text-urban-text-sec">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white
                       bg-linear-to-br from-urban-accent-from to-urban-accent-to
                       hover:brightness-110 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    filters.status ||
    filters.startDate ||
    filters.endDate ||
    (filters.channel && filters.channel !== "all") ||
    shipmentFilter !== "all" ||
    dispatchFilter !== "all" ||
    searchQuery.trim() !== "";

  const isEmpty = !loading && orders.length === 0;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          {/* <nav className="flex text-xs font-bold uppercase tracking-widest mb-1 gap-1.5 text-urban-text-muted">
            <span>Sales</span><span>/</span>
            <span className="text-urban-neon">Orders</span>
          </nav> */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-urban-text">
              Orders
            </h1>
            {loading && orders.length > 0 && (
              <Loader2 className="h-4 w-4 animate-spin text-urban-neon" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg
                       border border-urban-border bg-urban-raised text-urban-text-sec
                       hover:border-urban-neon hover:text-urban-neon transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl
                       bg-linear-to-br from-urban-accent-from to-urban-accent-to
                       shadow-sm hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Order
          </button>
        </div>
      </div>

      {/* New orders banner */}
      {pendingNewOrders > 0 && (
        <div
          className="flex items-center justify-between text-sm rounded-xl px-4 py-3"
          style={{
            background:
              "color-mix(in srgb, var(--color-urban-neon) 10%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--color-urban-neon) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-urban-neon" />
            <span className="font-semibold text-urban-text">
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
              className="text-xs font-semibold underline underline-offset-2 text-urban-neon"
            >
              Go to latest
            </button>
            <button
              onClick={dismissPending}
              className="text-xs text-urban-text-sec"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <OrdersToolbar
        filters={filters}
        sort={sort}
        totalOrders={pagination.totalOrders}
        loading={loading}
        onFilterChange={setFilters}
        onSortChange={setSort}
        onReset={() => { resetFilters(); setShipmentFilter("all"); setDispatchFilter("all"); setSearchQuery(""); }}
        showChannelFilter
        shipmentFilter={shipmentFilter}
        onShipmentFilterChange={setShipmentFilter}
        dispatchFilter={dispatchFilter}
        onDispatchFilterChange={setDispatchFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Orders table or empty state */}
      {isEmpty ? (
        <div className="un-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-urban-border" />
          {hasActiveFilters ? (
            <>
              <p className="font-semibold text-urban-text">
                No orders match your filters
              </p>
              <p className="text-sm mt-1 mb-4 text-urban-text-sec">
                Try adjusting or clearing your filter criteria.
              </p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white
                           bg-linear-to-br from-urban-accent-from to-urban-accent-to
                           hover:brightness-110 transition-all"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold text-urban-text">No orders yet</p>
              <p className="text-sm mt-1 mb-4 text-urban-text-sec">
                Website and Instagram orders will appear here.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white
                           bg-linear-to-br from-urban-accent-from to-urban-accent-to
                           hover:brightness-110 transition-all"
              >
                <Plus className="h-4 w-4" />
                Create Instagram Order
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="un-card overflow-hidden">
          <OrdersTable
            orders={orders}
            sort={sort}
            selectedOrder={selectedOrder}
            onSort={setSort}
            onSelectOrder={selectOrder}
            shippedOrderIds={shippedOrderIds}
            dispatchedOrderIds={dispatchedOrderIds}
            onDispatch={handleDispatch}
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

      {/* Drawers */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={closeDrawer}
        onOrderUpdated={refetch}
      />
      <CreateOrderDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
