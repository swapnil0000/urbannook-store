import { useState, useEffect } from "react";
import { Truck, Loader2, AlertCircle } from "lucide-react";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";

// Must match SHIPMOZO_DEFAULT_WAREHOUSE_ID in server .env
const DEFAULT_WAREHOUSE_ID = "109337";

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

const DIMENSION_FIELDS = [
  { field: "weight", label: "Weight (g)", placeholder: "200" },
  { field: "length", label: "Length (cm)", placeholder: "30" },
  { field: "width",  label: "Width (cm)",  placeholder: "20" },
  { field: "height", label: "Height (cm)", placeholder: "10" },
];

const initialForm = {
  paymentType: "PREPAID",
  weight: "",
  length: "",
  width: "",
  height: "",
  warehouseId: DEFAULT_WAREHOUSE_ID,
};

/**
 * ShipmentSection — shown at the bottom of OrderDetailDrawer.
 *
 * Props:
 *   orderId    — the order's orderId string (e.g. "IG-0042")
 *   orderType  — "INSTAGRAM" | "WEBSITE"
 *
 * Lifecycle:
 *   1. On mount → GET /admin/shipmozo/shipment/:orderId
 *      - null response → show "Create Shipment" prompt
 *      - record response → show shipment status card
 *   2. When form expands → GET /admin/shipmozo/warehouses (once)
 *   3. On submit → POST /admin/shipmozo/push-order → show record on success
 */
export default function ShipmentSection({ orderId, orderType }) {
  const { showToast } = useToast();

  const [shipment, setShipment] = useState(undefined); // undefined = loading
  const [loadingShipment, setLoadingShipment] = useState(true);

  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [form, setForm] = useState(initialForm);

  // ── Fetch existing shipment on mount ────────────────────────────────────
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

  // ── Fetch warehouses once when form is first expanded ───────────────────
  useEffect(() => {
    if (!formVisible || warehousesLoaded) return;
    let cancelled = false;

    apiClient
      .get("/admin/shipmozo/warehouses")
      .then((res) => {
        if (cancelled) return;
        const list = res.data.data;
        if (Array.isArray(list) && list.length > 0) {
          setWarehouses(list);
          // Pre-select default warehouse if found, else pick first
          const defaultEntry = list.find(
            (w) =>
              String(w.id ?? w.warehouse_id ?? "") === DEFAULT_WAREHOUSE_ID,
          );
          const preselect = defaultEntry
            ? DEFAULT_WAREHOUSE_ID
            : String(list[0].id ?? list[0].warehouse_id ?? "");
          setForm((f) => ({ ...f, warehouseId: preselect }));
        }
      })
      .catch(() => {
        // Silently fall back to free-text warehouse ID input
      })
      .finally(() => {
        if (!cancelled) setWarehousesLoaded(true);
      });

    return () => { cancelled = true; };
  }, [formVisible, warehousesLoaded]);

  const handleFieldChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSubmitError(null);
  };

  const handleCancelForm = () => {
    setFormVisible(false);
    setSubmitError(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Client-side validation
    const w = Number(form.weight);
    const l = Number(form.length);
    const wi = Number(form.width);
    const h = Number(form.height);
    if (!w || w <= 0) { setSubmitError("Weight must be a positive number."); return; }
    if (!l || l <= 0) { setSubmitError("Length must be a positive number."); return; }
    if (!wi || wi <= 0) { setSubmitError("Width must be a positive number."); return; }
    if (!h || h <= 0) { setSubmitError("Height must be a positive number."); return; }
    if (!form.warehouseId.trim()) { setSubmitError("Warehouse is required."); return; }

    setSubmitting(true);
    try {
      const res = await apiClient.post("/admin/shipmozo/push-order", {
        orderId,
        orderType,
        warehouseId: form.warehouseId.trim(),
        paymentType: form.paymentType,
        weight: w,
        length: l,
        width: wi,
        height: h,
      });

      setShipment(res.data.data);
      setFormVisible(false);
      showToast("Shipment pushed to Shipmozo!", "success");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to create shipment. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
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

      {/* ── Shipment record exists ────────────────────────────────────────── */}
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
      ) : !formVisible ? (
        /* ── No shipment yet — prompt ────────────────────────────────────── */
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-sm text-gray-500">No shipment created yet.</p>
          <button
            type="button"
            onClick={() => setFormVisible(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
          >
            <Truck className="h-3.5 w-3.5" />
            Create Shipment
          </button>
        </div>
      ) : (
        /* ── Create shipment form ────────────────────────────────────────── */
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Error banner */}
          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Payment type toggle */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Payment Type
            </p>
            <div className="flex gap-2">
              {["PREPAID", "COD"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFieldChange("paymentType", type)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    form.paymentType === type
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Weight + Dimensions */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">
              Weight &amp; Dimensions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DIMENSION_FIELDS.map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={form[field]}
                    onChange={(e) =>
                      handleFieldChange(field, e.target.value)
                    }
                    placeholder={placeholder}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Warehouse select / fallback text input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Warehouse
            </label>
            {warehouses.length > 0 ? (
              <select
                value={form.warehouseId}
                onChange={(e) =>
                  handleFieldChange("warehouseId", e.target.value)
                }
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {warehouses.map((w) => {
                  const id = String(w.id ?? w.warehouse_id ?? "");
                  const name = w.name ?? w.warehouse_name ?? id;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                value={form.warehouseId}
                onChange={(e) =>
                  handleFieldChange("warehouseId", e.target.value)
                }
                placeholder="Warehouse ID"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={submitting}
              className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {submitting ? "Pushing…" : "Push to Shipmozo"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
