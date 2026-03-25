import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { selectWebsiteOrders, selectInstagramOrders } from "../store/ordersSlice";
import { useTableState } from "../components/management/useTableState";
import PendingFulfillmentTable from "../components/management/PendingFulfillmentTable";
import PriorityOrdersTable from "../components/management/PriorityOrdersTable";
// import ActiveShipmentsTable from "../components/management/ActiveShipmentsTable";
import OrderDetailPanel from "../components/orders/OrderDetailPanel";

export default function Management() {
  const navigate        = useNavigate();
  const { showToast }   = useToast();
  const websiteOrders   = useSelector(selectWebsiteOrders);
  const instagramOrders = useSelector(selectInstagramOrders);

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const hasAutoOpenedRef            = useRef(false);

  // T3 state — kept for when Active Shipments table is re-enabled
  // const [dispatchState, setDispatchState] = useState({});

  // ── Derived datasets — split by isPriority flag (from DB), oldest first ─────
  const pendingOrders = useMemo(
    () => (data?.pendingFulfillment ?? []).filter((o) => !o.isPriority),
    [data],
  );
  const priorityOrders = useMemo(
    // Same oldest-first order as pending (FIFO — oldest order gets shipped first)
    () =>
      (data?.pendingFulfillment ?? [])
        .filter((o) => o.isPriority)
        .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data],
  );
  const activeShipments = useMemo(
    // Backend returns newest-first — reverse to oldest-first
    () => [...(data?.activeShipments ?? [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [data],
  );

  // ── Per-table hook state (called unconditionally, fixed order) ───────────────
  const tPending   = useTableState(pendingOrders);
  const tPriority  = useTableState(priorityOrders);
  // kept for T3 re-enable — hooks must be called unconditionally
  const _tActive   = useTableState(activeShipments); // eslint-disable-line @typescript-eslint/no-unused-vars

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/management/fulfillment");
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load fulfillment data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Toggle Priority — writes to DB so every admin sees the change ─────────────
  const handleTogglePriority = useCallback(async (orderId, source) => {
    // Optimistic update: flip isPriority immediately in local state
    setData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        pendingFulfillment: prev.pendingFulfillment.map((o) =>
          o.orderId === orderId
            ? { ...o, isPriority: !o.isPriority, prioritizedAt: !o.isPriority ? now : null }
            : o,
        ),
      };
    });

    try {
      await apiClient.patch(`/admin/management/priority/${orderId}`, null, {
        params: { source },
      });
    } catch (err) {
      // Revert on failure
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingFulfillment: prev.pendingFulfillment.map((o) =>
            o.orderId === orderId
              ? { ...o, isPriority: !o.isPriority, prioritizedAt: o.isPriority ? null : o.prioritizedAt }
              : o,
          ),
        };
      });
      showToast(err.response?.data?.message || "Failed to update priority.", "error");
    }
  }, [showToast]);

  // ── Ship Now ─────────────────────────────────────────────────────────────────
  const handleShipNow = useCallback((row) => {
    const pool      = row.source === "WEBSITE" ? websiteOrders : instagramOrders;
    const fullOrder = pool.find((o) => o.orderId === row.orderId);
    if (!fullOrder) {
      showToast("Order data not loaded yet — please refresh.", "error");
      return;
    }
    // Optimistically remove from pending list
    setData((prev) =>
      prev
        ? { ...prev, pendingFulfillment: prev.pendingFulfillment.filter((o) => o.orderId !== row.orderId) }
        : prev,
    );
    navigate(`/admin/shipment/create/${row.orderId}`, {
      state: { order: fullOrder, returnTo: "/admin/management" },
    });
  }, [websiteOrders, instagramOrders, navigate, showToast]);

  // ── Row Click → open drawer ───────────────────────────────────────────────────
  const handleRowClick = useCallback((row) => {
    const pool      = row.source === "WEBSITE" ? websiteOrders : instagramOrders;
    const fullOrder = pool.find((o) => o.orderId === row.orderId);
    if (!fullOrder) {
      showToast("Order data not loaded yet — please refresh.", "error");
      return;
    }
    setSelectedOrder(fullOrder);
  }, [websiteOrders, instagramOrders, showToast]);

  // ── Auto-open top priority order on first data load ───────────────────────────
  useEffect(() => {
    if (hasAutoOpenedRef.current || !data) return;
    const topPriority = (data.pendingFulfillment ?? [])
      .filter((o) => o.isPriority)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    if (!topPriority) return;
    const pool = topPriority.source === "WEBSITE" ? websiteOrders : instagramOrders;
    const fullOrder = pool.find((o) => o.orderId === topPriority.orderId);
    if (fullOrder) {
      hasAutoOpenedRef.current = true;
      setSelectedOrder(fullOrder);
    }
  }, [data, websiteOrders, instagramOrders]);

  // ── Check Dispatch — kept for T3 re-enable ───────────────────────────────────
  // const handleCheckDispatch = useCallback(async (shipment) => { ... }, [showToast]);

  // ── Loading / Error ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>Something went wrong</p>
        <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>{error}</p>
        <button
          onClick={() => fetchData()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--gradient-urban-accent)" }}
        >
          <RefreshCw className="h-4 w-4" />Retry
        </button>
      </div>
    );
  }

  // ── Layout ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
          Management
        </h1>
        <button
          onClick={() => fetchData(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all"
          style={{ border: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" }}
        >
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      {/* Main: left = stacked tables, right = inline order detail */}
      <div className="flex gap-5 items-start">

        {/* Left column — T1 + T2 stacked */}
        <div className="flex-1 min-w-0 space-y-5">
          <PendingFulfillmentTable
            t={tPending}
            onShip={handleShipNow}
            onTogglePriority={handleTogglePriority}
            onRowClick={handleRowClick}
            selectedOrderId={selectedOrder?.orderId}
          />
          <PriorityOrdersTable
            t={tPriority}
            onShip={handleShipNow}
            onTogglePriority={handleTogglePriority}
            onRowClick={handleRowClick}
            selectedOrderId={selectedOrder?.orderId}
          />
        </div>

        {/* Right column — order detail panel */}
        <div className="w-90 xl:w-105 shrink-0 sticky top-4">
          {selectedOrder ? (
            <OrderDetailPanel
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onOrderUpdated={() => fetchData(true)}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-xl py-20 gap-2"
              style={{ border: "1px dashed var(--color-urban-border)", background: "var(--color-urban-raised)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--color-urban-text-muted)" }}>
                No order selected
              </p>
              <p className="text-xs text-center px-6" style={{ color: "var(--color-urban-text-muted)", opacity: 0.6 }}>
                Click any row to view its details here
              </p>
            </div>
          )}
        </div>

      </div>

      {/* T3: Active Shipments — commented out for now */}
      {/* <ActiveShipmentsTable t={_tActive} dispatchState={dispatchState} onCheckDispatch={handleCheckDispatch} /> */}

      {/* T4: TBD — commented out for now */}
    </div>
  );
}
