import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Globe, Truck, CheckCircle2, PackageCheck, X } from "lucide-react";
import OrderStatusBadge from "./OrderStatusBadge";
import { useToast } from "../../context/ToastContext";

/**
 * A single table row. Clicking it opens the detail drawer.
 * Intentionally stateless — all interaction is lifted to the parent via onSelect.
 */
export default function OrderRow({ order, isSelected, onSelect, isShipped, isDispatched, onDispatch }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const itemCount = order.items?.length ?? 0;

  // Guard: amount may be missing on legacy or malformed records
  const formattedAmount =
    typeof order.amount === "number"
      ? `₹${order.amount.toLocaleString()}`
      : "—";

  // _channel is set by useAllOrders; fallback to orderId prefix
  const isInstagram = order._channel === "instagram" || order.orderId?.startsWith("IG-") || Boolean(order.customerName);

  // Instagram orders show orderedAt (admin-entered date); website orders use createdAt
  const displayDate = isInstagram
    ? order.orderedAt || order.createdAt
    : order.createdAt;
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  // Truncate long order IDs with ellipsis for table readability
  const displayOrderId = order.orderId
    ? order.orderId.length > 20
      ? `${order.orderId.slice(0, 10)}…${order.orderId.slice(-6)}`
      : order.orderId
    : (order._id ?? "—");

  // ── Create Shipment handler ──────────────────────────────────────────────
  const handleCreateShipment = (e) => {
    e.stopPropagation(); // don't open the detail drawer
    // Block shipment creation for any non-PAID order
    if (order.status !== "PAID") {
      showToast(
        `Action Denied: Only PAID orders can be shipped. Current status: ${order.status ?? "unknown"}.`,
        "error",
      );
      return;
    }
    navigate(`/admin/shipment/create/${order.orderId}`, { state: { order } });
  };

  // ── View Shipment handler ────────────────────────────────────────────────
  const handleViewShipment = (e) => {
    e.stopPropagation();
    navigate("/admin/shipments");
  };

  // Customer column: userId for website, N/A for Instagram
  const customerDisplay = isInstagram ? "N/A" : order.userId || "—";

  // Name column: customerName for Instagram, userName for website
  const nameDisplay = isInstagram
    ? order.customerName || "—"
    : order.userName || "—";

  return (
    <tr
      onClick={() => onSelect(order)}
      className="cursor-pointer transition-colors"
      style={{
        borderTop: "1px solid var(--color-urban-border)",
        background: isSelected
          ? "color-mix(in srgb, var(--color-urban-neon) 6%, transparent)"
          : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background =
            "color-mix(in srgb, var(--color-urban-neon) 4%, transparent)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
      aria-selected={isSelected}
    >
      <td
        className="px-6 py-4 text-sm font-mono "
        style={{ color: "var(--color-urban-text)" }}
      >
        <div className="flex items-center gap-1.5">
          {isInstagram ? (
            <Camera
              className="h-3.5 w-3.5 text-pink-400 shrink-0"
              aria-label="Instagram order"
            />
          ) : (
            <Globe
              className="h-3.5 w-3.5 text-blue-300 shrink-0"
              aria-label="Website order"
            />
          )}
          <span title={order.orderId}>{displayOrderId}</span>
        </div>
      </td>

      {/* <td
        className="px-6 py-4 text-sm max-w-[160px] truncate"
        style={{ color: "var(--color-urban-text-sec)" }}
      >
        {customerDisplay}
      </td> */}
      <td
        className="px-6 py-4 text-sm max-w-[160px] truncate"
        style={{ color: "var(--color-urban-text)" }}
      >
        {nameDisplay}
      </td>
      <td
        className="px-6 py-4 text-sm"
        style={{ color: "var(--color-urban-text-sec)" }}
      >
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </td>
      <td
        className="px-6 py-4 text-sm font-semibold"
        style={{ color: "var(--color-urban-neon)" }}
      >
        {formattedAmount}
      </td>
      <td className="px-6 py-4">
        <OrderStatusBadge status={order.status} />
      </td>
      <td
        className="px-6 py-4 text-sm"
        style={{ color: "var(--color-urban-text-muted)" }}
      >
        {formattedDate}
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1.5">
          {/* ── Shipment action ── */}
          {isShipped ? (
            <button
              onClick={handleViewShipment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap hover:brightness-95"
              style={{ border: "1px solid #86efac", color: "#15803d", background: "#dcfce7" }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Shipped
            </button>
          ) : (
            <button
              onClick={handleCreateShipment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              style={{
                border: "1px solid var(--color-urban-border)",
                color: "var(--color-urban-text-sec)",
                background: "var(--color-urban-raised)",
              }}
            >
              <Truck className="h-3 w-3" />
              Create Shipment
            </button>
          )}

          {/* ── Dispatch action ── */}
          {isDispatched ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap"
              style={{ border: "1px solid #6ee7b7", color: "#065f46", background: "#d1fae5" }}
            >
              <PackageCheck className="h-3 w-3" />
              Dispatched
            </span>
          ) : !isShipped ? (
            /* Shipment not created yet — show locked hint */
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-not-allowed"
              style={{
                border: "1px solid var(--color-urban-border)",
                color: "var(--color-urban-text-muted)",
                background: "var(--color-urban-raised)",
                opacity: 0.5,
              }}
              title="Create a shipment first before dispatching"
            >
              <PackageCheck className="h-3 w-3" />
              Dispatch
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              style={{
                border: "1px solid var(--color-urban-border)",
                color: "var(--color-urban-text-sec)",
                background: "var(--color-urban-raised)",
              }}
            >
              <PackageCheck className="h-3 w-3" />
              Dispatch
            </button>
          )}
        </div>

        {/* ── Dispatch confirmation modal (fixed overlay — DOM position irrelevant) ── */}
        {confirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(false); }}
          >
            <div
              className="relative rounded-2xl p-6 w-80 shadow-2xl"
              style={{
                background: "var(--color-urban-panel)",
                border: "1px solid var(--color-urban-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setConfirmOpen(false)}
                className="absolute top-3 right-3 p-1 rounded-lg transition-colors"
                style={{ color: "var(--color-urban-text-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center justify-center h-9 w-9 rounded-xl shrink-0"
                  style={{ background: "#d1fae5" }}
                >
                  <PackageCheck className="h-4 w-4" style={{ color: "#065f46" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--color-urban-text)" }}>
                    Confirm Dispatch
                  </p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "var(--color-urban-text-muted)" }}>
                    {order.orderId}
                  </p>
                </div>
              </div>

              <p className="text-xs mb-5" style={{ color: "var(--color-urban-text-sec)" }}>
                Mark this order as handed over to the courier for pickup? This action cannot be undone.
              </p>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{
                    border: "1px solid var(--color-urban-border)",
                    color: "var(--color-urban-text-sec)",
                    background: "var(--color-urban-raised)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmOpen(false);
                    onDispatch?.(order.orderId, isInstagram ? "INSTAGRAM" : "WEBSITE");
                  }}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg transition-colors"
                  style={{ background: "#059669", color: "#fff" }}
                >
                  Yes, Dispatch
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
