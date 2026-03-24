import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ClipboardList,
  Loader2,
  AlertCircle,
  RefreshCw,
  Instagram,
  Globe,
  Truck,
  PackageCheck,
  CheckCircle2,
  Clock,
  MailX,
  Mail,
} from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { selectWebsiteOrders, selectInstagramOrders } from "../store/ordersSlice";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

const STATUS_LABELS = {
  PUSHED:            { label: "Pushed",            bg: "#dbeafe", color: "#1e40af" },
  ASSIGNED:          { label: "Assigned",           bg: "#e0e7ff", color: "#3730a3" },
  PICKUP_SCHEDULED:  { label: "Pickup Scheduled",   bg: "#fef9c3", color: "#854d0e" },
  IN_TRANSIT:        { label: "In Transit",         bg: "#dcfce7", color: "#166534" },
  OUT_FOR_DELIVERY:  { label: "Out for Delivery",   bg: "#d1fae5", color: "#065f46" },
  DELIVERED:         { label: "Delivered",          bg: "#bbf7d0", color: "#14532d" },
  CANCELLED:         { label: "Cancelled",          bg: "#fee2e2", color: "#991b1b" },
  RTO_INITIATED:     { label: "RTO Initiated",      bg: "#fce7f3", color: "#9d174d" },
  RTO_DELIVERED:     { label: "RTO Delivered",      bg: "#fce7f3", color: "#9d174d" },
  EXCEPTION:         { label: "Exception",          bg: "#fee2e2", color: "#991b1b" },
};

const DISPATCHED_FINAL = new Set([
  "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RTO_INITIATED", "RTO_DELIVERED",
]);

// ── sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  const isIG = source === "INSTAGRAM";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={
        isIG
          ? { background: "#fce7f3", color: "#9d174d" }
          : { background: "#dbeafe", color: "#1e40af" }
      }
    >
      {isIG ? <Instagram className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
      {isIG ? "IG" : "WS"}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, count, accent }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
        style={{ background: accent + "20", border: `1px solid ${accent}40` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div>
        <h2 className="text-base font-bold" style={{ color: "var(--color-urban-text)" }}>
          {title}
        </h2>
      </div>
      {count != null && (
        <span
          className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "var(--color-urban-raised)",
            color: "var(--color-urban-text-muted)",
            border: "1px solid var(--color-urban-border)",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Management() {
  const navigate     = useNavigate();
  const { showToast } = useToast();

  // Redux store — used to look up full order objects when navigating to CreateShipment
  const websiteOrders   = useSelector(selectWebsiteOrders);
  const instagramOrders = useSelector(selectInstagramOrders);

  // Page-level fetch state (separate from Redux — this endpoint has its own data)
  const [data, setData]       = useState(null);   // { pendingFulfillment, activeShipments }
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Per-row dispatch state: { [shipmentId]: "idle"|"loading"|"dispatched"|"not_yet"|"no_awb"|"error" }
  const [dispatchState, setDispatchState] = useState({});

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

  // ── Ship Now ─────────────────────────────────────────────────────────────────
  const handleShipNow = useCallback((row) => {
    // Guard: only PAID orders can be shipped (same check as Orders page)
    if (row.status && row.status !== "PAID") {
      showToast(`Only PAID orders can be shipped. Current status: ${row.status}`, "error");
      return;
    }

    // Look up the full order from Redux store (has all fields CreateShipment needs)
    const pool      = row.source === "WEBSITE" ? websiteOrders : instagramOrders;
    const fullOrder = pool.find((o) => o.orderId === row.orderId);

    if (!fullOrder) {
      showToast("Order data not loaded yet — please refresh the page.", "error");
      return;
    }

    // Optimistic removal from Table 1
    setData((prev) =>
      prev
        ? {
            ...prev,
            pendingFulfillment: prev.pendingFulfillment.filter(
              (o) => o.orderId !== row.orderId,
            ),
          }
        : prev,
    );

    // Use the same route path as the Orders page ShipmentSection
    navigate(`/admin/shipment/create/${row.orderId}`, {
      state: { order: fullOrder, returnTo: "/admin/management" },
    });
  }, [websiteOrders, instagramOrders, navigate, showToast]);

  // ── Check Dispatch ────────────────────────────────────────────────────────────
  const handleCheckDispatch = useCallback(async (shipment) => {
    const id = shipment._id;
    setDispatchState((prev) => ({ ...prev, [id]: "loading" }));

    try {
      const res    = await apiClient.post(`/admin/management/confirm-dispatch/${id}`);
      const result = res.data.data;

      if (result.dispatched) {
        setDispatchState((prev) => ({ ...prev, [id]: "dispatched" }));
        // Update the row in local state to reflect dispatchConfirmedAt
        setData((prev) =>
          prev
            ? {
                ...prev,
                activeShipments: prev.activeShipments.map((s) =>
                  s._id === id
                    ? { ...s, dispatchConfirmedAt: result.dispatchConfirmedAt }
                    : s,
                ),
              }
            : prev,
        );
        const emailMsg = result.emailSent
          ? " Dispatch email sent."
          : result.noEmailReason
          ? ` (${result.noEmailReason})`
          : "";
        showToast(`Dispatch confirmed!${emailMsg}`, "success");
      } else if (result.noAwb) {
        setDispatchState((prev) => ({ ...prev, [id]: "no_awb" }));
        showToast("No AWB yet — assign a courier first.", "info");
      } else {
        setDispatchState((prev) => ({ ...prev, [id]: "not_yet" }));
        showToast(`Not picked up yet (${result.currentStatus || "Pickup Pending"})`, "info");
      }
    } catch (err) {
      setDispatchState((prev) => ({ ...prev, [id]: "error" }));
      showToast(err.response?.data?.message || "Check dispatch failed.", "error");
    }
  }, [showToast]);

  // ── Loading / Error states ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
          Management
        </h1>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-urban-neon" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
          Management
        </h1>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>Something went wrong</p>
          <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>{error}</p>
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white
                       bg-linear-to-br from-urban-accent-from to-urban-accent-to hover:brightness-110 transition-all"
          >
            <RefreshCw className="h-4 w-4" />Retry
          </button>
        </div>
      </div>
    );
  }

  const pending  = data?.pendingFulfillment  ?? [];
  const shipments = data?.activeShipments   ?? [];

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
          Management
        </h1>
        <button
          onClick={() => fetchData(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all
                     border border-urban-border bg-urban-raised text-urban-text-sec
                     hover:border-urban-neon hover:text-urban-neon"
        >
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TABLE 1 — Pending Fulfillment                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={ClipboardList}
          title="Pending Fulfillment"
          count={pending.length}
          accent="#f59e0b"
        />

        {pending.length === 0 ? (
          <div
            className="un-card p-10 flex flex-col items-center justify-center gap-3 text-center"
            style={{ border: "1px dashed var(--color-urban-border)" }}
          >
            <PackageCheck className="h-10 w-10" style={{ color: "var(--color-urban-border)" }} />
            <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>All caught up!</p>
            <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
              No paid orders waiting for shipment.
            </p>
          </div>
        ) : (
          <div className="un-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--color-urban-border)",
                    background: "var(--color-urban-raised)",
                  }}
                >
                  {["Source", "Order ID", "Customer", "Date", "Products", "Amount", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((row, idx) => (
                  <tr
                    key={row.orderId}
                    style={{
                      borderBottom:
                        idx < pending.length - 1
                          ? "1px solid var(--color-urban-border)"
                          : "none",
                    }}
                    className="hover:bg-urban-neon/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <SourceBadge source={row.source} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="font-mono text-xs font-semibold"
                        style={{ color: "var(--color-urban-text)" }}
                      >
                        {row.orderId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: "var(--color-urban-text)" }}>
                        {row.customerName}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--color-urban-text-sec)" }}>
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3 max-w-55" style={{ color: "var(--color-urban-text-sec)" }}>
                      <span className="line-clamp-2 text-xs leading-relaxed">
                        {productSummary(row.items)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold" style={{ color: "var(--color-urban-neon)" }}>
                      ₹{(row.amount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleShipNow(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                                   text-white transition-all hover:brightness-110 active:scale-95"
                        style={{ background: "var(--gradient-urban-accent)" }}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Ship Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TABLE 2 — Active Shipments                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={Truck}
          title="Active Shipments"
          count={shipments.length}
          accent="#22c55e"
        />

        {shipments.length === 0 ? (
          <div
            className="un-card p-10 flex flex-col items-center justify-center gap-3 text-center"
            style={{ border: "1px dashed var(--color-urban-border)" }}
          >
            <Truck className="h-10 w-10" style={{ color: "var(--color-urban-border)" }} />
            <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>No active shipments</p>
            <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
              Push orders from Table 1 to see them here.
            </p>
          </div>
        ) : (
          <div className="un-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-225">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--color-urban-border)",
                      background: "var(--color-urban-raised)",
                    }}
                  >
                    {["Source", "Shipment Ref", "Order ID", "Customer", "Status", "AWB / Courier", "Pushed On", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: "var(--color-urban-text-muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s, idx) => {
                    const rowState = dispatchState[s._id];
                    const alreadyConfirmed =
                      !!s.dispatchConfirmedAt || rowState === "dispatched";
                    const isDispatching = rowState === "loading";

                    return (
                      <tr
                        key={s._id}
                        style={{
                          borderBottom:
                            idx < shipments.length - 1
                              ? "1px solid var(--color-urban-border)"
                              : "none",
                          background: alreadyConfirmed
                            ? "color-mix(in srgb, #22c55e 4%, transparent)"
                            : undefined,
                        }}
                        className="hover:bg-urban-neon/5 transition-colors"
                      >
                        {/* Source */}
                        <td className="px-4 py-3">
                          <SourceBadge source={s.sourceOrderType} />
                        </td>

                        {/* Shipment Ref */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="font-mono text-xs"
                            style={{ color: "var(--color-urban-text-muted)" }}
                          >
                            {s.shipmentRefId}
                          </span>
                        </td>

                        {/* Order ID */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="font-mono text-xs font-semibold"
                            style={{ color: "var(--color-urban-text)" }}
                          >
                            {s.sourceOrderId}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <span className="font-medium" style={{ color: "var(--color-urban-text)" }}>
                            {s.customerName}
                          </span>
                          {s.sourceOrderType === "INSTAGRAM" && (
                            <span
                              className="block text-[10px] mt-0.5"
                              style={{ color: "var(--color-urban-text-muted)" }}
                            >
                              No email
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={s.shipmentStatus} />
                        </td>

                        {/* AWB + Courier */}
                        <td className="px-4 py-3">
                          {s.awbNumber ? (
                            <div>
                              <span
                                className="font-mono text-xs font-semibold block"
                                style={{ color: "var(--color-urban-text)" }}
                              >
                                {s.awbNumber}
                              </span>
                              {s.courierCompany && (
                                <span
                                  className="text-xs"
                                  style={{ color: "var(--color-urban-text-muted)" }}
                                >
                                  {s.courierCompany}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              className="text-xs italic"
                              style={{ color: "var(--color-urban-text-muted)" }}
                            >
                              Not assigned
                            </span>
                          )}
                        </td>

                        {/* Pushed On */}
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--color-urban-text-sec)" }}>
                          {formatDate(s.createdAt)}
                        </td>

                        {/* Dispatch button */}
                        <td className="px-4 py-3 text-right">
                          <DispatchButton
                            shipment={s}
                            rowState={rowState}
                            alreadyConfirmed={alreadyConfirmed}
                            isDispatching={isDispatching}
                            onCheck={handleCheckDispatch}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── DispatchButton ─────────────────────────────────────────────────────────────
// Extracted to avoid inline complexity in the table row

function DispatchButton({ shipment, rowState, alreadyConfirmed, isDispatching, onCheck }) {
  // Already dispatched & confirmed
  if (alreadyConfirmed) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
        style={{ background: "#dcfce7", color: "#166534" }}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Dispatched
        {shipment.sourceOrderType === "INSTAGRAM" && (
          <span title="Instagram — no email" className="ml-1 opacity-60">
            <MailX className="h-3 w-3" />
          </span>
        )}
      </div>
    );
  }

  // Not picked up yet feedback
  if (rowState === "not_yet") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
          style={{ background: "#fef9c3", color: "#854d0e" }}
        >
          <Clock className="h-3 w-3" />
          Not picked up yet
        </div>
        <button
          onClick={() => onCheck(shipment)}
          className="text-[10px] font-semibold underline"
          style={{ color: "var(--color-urban-text-muted)" }}
        >
          Check again
        </button>
      </div>
    );
  }

  // No AWB assigned
  if (rowState === "no_awb") {
    return (
      <span
        className="text-[10px] italic"
        style={{ color: "var(--color-urban-text-muted)" }}
      >
        Assign courier first
      </span>
    );
  }

  // Error state
  if (rowState === "error") {
    return (
      <button
        onClick={() => onCheck(shipment)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Retry
      </button>
    );
  }

  // Default: Check Dispatch button
  return (
    <button
      onClick={() => onCheck(shipment)}
      disabled={isDispatching}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all
                 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: "var(--color-urban-raised)",
        color: isDispatching ? "var(--color-urban-text-muted)" : "var(--color-urban-neon)",
        border: "1px solid var(--color-urban-border)",
      }}
    >
      {isDispatching ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking…
        </>
      ) : (
        <>
          <PackageCheck className="h-3.5 w-3.5" />
          Check Dispatch
        </>
      )}
    </button>
  );
}
