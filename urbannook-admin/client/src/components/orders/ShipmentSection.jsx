import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";

const STATUS_STYLES = {
  PUSHED: { background: "#dbeafe", color: "#1d4ed8" },
  ASSIGNED: { background: "#e0e7ff", color: "#4338ca" },
  PICKUP_SCHEDULED: { background: "#f3e8ff", color: "#7e22ce" },
  IN_TRANSIT: { background: "#fef9c3", color: "#92400e" },
  OUT_FOR_DELIVERY: { background: "#fff7ed", color: "#c2410c" },
  DELIVERED: { background: "#dcfce7", color: "#15803d" },
  CANCELLED: { background: "#fee2e2", color: "#b91c1c" },
  RTO_INITIATED: { background: "#fee2e2", color: "#b91c1c" },
  RTO_DELIVERED: { background: "#f3f4f6", color: "#6b7280" },
  EXCEPTION: { background: "#fecaca", color: "#991b1b" },
};

/**
 * ShipmentSection — shown at the bottom of OrderDetailDrawer.
 *
 * Props:
 *   orderId    — the order's orderId string (e.g. "IG-0042")
 *   orderType  — "INSTAGRAM" | "WEBSITE"
 *   order      — the full order object (passed from OrderDetailDrawer for navigation state)
 *
 * Shows:
 *   • Loading spinner while checking for an existing shipment
 *   • Shipment status card if one exists (with shipmozoOrderId, AWB, courier, etc.)
 *   • "Create Shipment →" navigation button if none exists
 */
export default function ShipmentSection({ orderId, orderType, order }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [shipment, setShipment] = useState(undefined); // undefined = loading
  const [loadingShipment, setLoadingShipment] = useState(true);

  // ── Check for existing shipment on mount ─────────────────────────────────
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setLoadingShipment(true);

    apiClient
      .get(`/admin/shipmozo/shipment/${orderId}`)
      .then((res) => {
        if (!cancelled) setShipment(res.data.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setShipment(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingShipment(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // ── Loading ────────────────
  if (loadingShipment) {
    return (
      <section aria-label="Shipment">
        <div className="flex items-center gap-2 mb-3">
          <Truck
            className="h-4 w-4"
            style={{ color: "var(--color-urban-text-muted)" }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-urban-text-sec)" }}
          >
            Shipment
          </h3>
        </div>
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--color-urban-text-muted)" }}
        >
          <Loader2
            className="h-3.5 w-3.5 animate-spin"
            style={{ color: "var(--color-urban-neon)" }}
          />
          Checking shipment…
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Shipment">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Truck
            className="h-4 w-4"
            style={{ color: "var(--color-urban-text-muted)" }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-urban-text-sec)" }}
          >
            Shipment
          </h3>
        </div>
        {shipment && !shipment.isCancelled && (
          <button
            type="button"
            onClick={() => navigate("/admin/shipments")}
            className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
            style={{ color: "var(--color-urban-neon)" }}
          >
            View in Shipments
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ── Existing shipment record ───────────────────────────────────────── */}
      {shipment && !shipment.isCancelled ? (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--color-urban-raised)",
            border: "1px solid var(--color-urban-border)",
          }}
        >
          {/* Status + AWB row */}
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
              style={
                STATUS_STYLES[shipment.shipmentStatus] ?? {
                  background: "#f3f4f6",
                  color: "#6b7280",
                }
              }
            >
              {shipment.shipmentStatus}
            </span>
            {shipment.awbNumber && (
              <span
                className="text-xs font-mono"
                style={{ color: "var(--color-urban-text-muted)" }}
              >
                AWB: {shipment.awbNumber}
              </span>
            )}
          </div>

          {/* Shipmozo order ID */}
          {shipment.shipmozoOrderId && (
            <div>
              <p
                className="text-[10px] uppercase font-semibold mb-0.5"
                style={{ color: "var(--color-urban-text-muted)" }}
              >
                Shipmozo Order ID
              </p>
              <p
                className="text-xs font-mono break-all"
                style={{ color: "var(--color-urban-text-sec)" }}
              >
                {shipment.shipmozoOrderId}
              </p>
            </div>
          )}

          {/* Package details grid */}
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
            <span>
              Payment:{" "}
              <span
                className="font-medium"
                style={{ color: "var(--color-urban-text-sec)" }}
              >
                {shipment.paymentType}
              </span>
            </span>
            <span>
              Warehouse:{" "}
              <span
                className="font-medium"
                style={{ color: "var(--color-urban-text-sec)" }}
              >
                {shipment.warehouseId}
              </span>
            </span>
            <span>
              Weight:{" "}
              <span
                className="font-medium"
                style={{ color: "var(--color-urban-text-sec)" }}
              >
                {shipment.weight}g
              </span>
            </span>
            <span>
              Dimensions:{" "}
              <span
                className="font-medium"
                style={{ color: "var(--color-urban-text-sec)" }}
              >
                {shipment.length}×{shipment.width}×{shipment.height} cm
              </span>
            </span>
          </div>

          {shipment.courierCompany && (
            <p
              className="text-xs"
              style={{ color: "var(--color-urban-text-muted)" }}
            >
              Courier:{" "}
              <span
                className="font-medium"
                style={{ color: "var(--color-urban-text-sec)" }}
              >
                {shipment.courierCompany}
              </span>
            </p>
          )}
        </div>
      ) : (
        /* ── No shipment yet — navigate to dedicated create page ──────────── */
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: "var(--color-urban-raised)",
            border: "1px solid var(--color-urban-border)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
            No shipment created yet.
          </p>
          <button
            type="button"
            onClick={() => {
              if (order?.status !== "PAID") {
                showToast(
                  `Action Denied: Only PAID orders can be shipped. Current status: ${order?.status ?? "unknown"}.`,
                  "error",
                );
                return;
              }
              navigate(`/admin/shipment/create/${orderId}`, {
                state: { order: order ?? { orderId } },
              });
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: "var(--color-urban-neon)" }}
          >
            <Truck className="h-3.5 w-3.5" />
            Create Shipment
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
