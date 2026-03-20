import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Loader2, ArrowRight } from "lucide-react";
import apiClient from "../../api/axios";

const STATUS_COLORS = {
  PUSHED:             "bg-blue-50 text-blue-700 border-blue-200",
  ASSIGNED:           "bg-indigo-50 text-indigo-700 border-indigo-200",
  PICKUP_SCHEDULED:   "bg-purple-50 text-purple-700 border-purple-200",
  IN_TRANSIT:         "bg-yellow-50 text-yellow-700 border-yellow-200",
  OUT_FOR_DELIVERY:   "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED:          "bg-green-50 text-green-700 border-green-200",
  CANCELLED:          "bg-red-50 text-red-700 border-red-200",
  RTO_INITIATED:      "bg-red-50 text-red-700 border-red-200",
  RTO_DELIVERED:      "bg-gray-100 text-gray-600 border-gray-200",
  EXCEPTION:          "bg-red-100 text-red-800 border-red-300",
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
 *   • Shipment status card if one exists
 *   • "Create Shipment →" navigation button if none exists
 */
export default function ShipmentSection({ orderId, orderType, order }) {
  const navigate = useNavigate();

  const [shipment,        setShipment]        = useState(undefined); // undefined = loading
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

    return () => { cancelled = true; };
  }, [orderId]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingShipment) {
    return (
      <section aria-label="Shipment">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Shipment</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking shipment…
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Shipment">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">Shipment</h3>
      </div>

      {/* ── Existing shipment record ───────────────────────────────────────── */}
      {shipment ? (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
                STATUS_COLORS[shipment.shipmentStatus] ??
                "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {shipment.shipmentStatus}
            </span>
            {shipment.awbNumber && (
              <span className="text-xs font-mono text-gray-500">
                AWB: {shipment.awbNumber}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-500">
            <span>
              Payment:{" "}
              <span className="font-medium text-gray-700">
                {shipment.paymentType}
              </span>
            </span>
            <span>
              Warehouse:{" "}
              <span className="font-medium text-gray-700">
                {shipment.warehouseId}
              </span>
            </span>
            <span>
              Weight:{" "}
              <span className="font-medium text-gray-700">
                {shipment.weight}g
              </span>
            </span>
            <span>
              Dimensions:{" "}
              <span className="font-medium text-gray-700">
                {shipment.length}×{shipment.width}×{shipment.height} cm
              </span>
            </span>
          </div>

          {shipment.courierCompany && (
            <p className="text-xs text-gray-500">
              Courier:{" "}
              <span className="font-medium text-gray-700">
                {shipment.courierCompany}
              </span>
            </p>
          )}
        </div>
      ) : (
        /* ── No shipment yet — navigate to dedicated create page ──────────── */
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-sm text-gray-500">No shipment created yet.</p>
          <button
            type="button"
            onClick={() =>
              navigate(`/admin/shipment/create/${orderId}`, {
                state: { order: order ?? { orderId } },
              })
            }
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
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
