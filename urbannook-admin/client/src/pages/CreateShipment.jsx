import { useState, useEffect } from "react";
import {
  useParams,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Truck,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Globe,
  Box,
} from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

// Must match SHIPMOZO_DEFAULT_WAREHOUSE_ID in server .env
const DEFAULT_WAREHOUSE_ID = "109337";

// Fixed physical specs per product (weight in grams, dimensions in cm)
const PRODUCT_DIMENSIONS = {
  "BMW Brake Caliper Lamp": { weight: 1000, length: 27, width: 26, height: 12 },
  "Stationery Suit Pen Stand": {
    weight: 1000,
    length: 12,
    width: 12,
    height: 12,
  },
};
// add here new products size

function InfoRow({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p
        className={`text-sm text-gray-900 ${
          mono ? "font-mono break-all" : "font-medium"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function SectionCard({ icon: Icon, title, badge, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {badge && (
          <span className="ml-auto text-xs text-gray-400 italic">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function CreateShipment() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Order is passed via navigation state from the Orders table row
  const order = location.state?.order;

  const [warehouses, setWarehouses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Auto-detect product from first item for pre-fill
  const firstProductName =
    order?.items?.[0]?.productSnapshot?.productName ?? "";
  const [dimensionPreset, setDimensionPreset] = useState(
    PRODUCT_DIMENSIONS[firstProductName] ? firstProductName : "",
  );

  const [form, setForm] = useState(() => {
    const dims = PRODUCT_DIMENSIONS[firstProductName] ?? null;
    return {
      paymentType: "PREPAID",
      weight: dims ? String(dims.weight) : "500",
      length: dims ? String(dims.length) : "10",
      width: dims ? String(dims.width) : "10",
      height: dims ? String(dims.height) : "10",
      warehouseId: DEFAULT_WAREHOUSE_ID,
    };
  });

  // Warn when order contains multiple distinct products
  const distinctProducts = [
    ...new Set(
      (order?.items ?? [])
        .map((i) => i.productSnapshot?.productName)
        .filter(Boolean),
    ),
  ];

  // Fetch warehouses once on mount
  useEffect(() => {
    apiClient
      .get("/admin/shipmozo/warehouses")
      .then((res) => {
        const list = res.data.data;
        if (Array.isArray(list) && list.length > 0) {
          setWarehouses(list);
          const match = list.find(
            (w) =>
              String(w.id ?? w.warehouse_id ?? "") === DEFAULT_WAREHOUSE_ID,
          );
          const preselect = match
            ? DEFAULT_WAREHOUSE_ID
            : String(list[0].id ?? list[0].warehouse_id ?? "");
          setForm((f) => ({ ...f, warehouseId: preselect }));
        }
      })
      .catch(() => {
        // Silent fail — falls back to text input with default value
      });
  }, []);

  // No order in state means user navigated directly via URL — send them to Orders
  if (!order) {
    return <Navigate to="/admin/orders" replace />;
  }

  const isInstagram = Boolean(order.customerName);
  const orderType = isInstagram ? "INSTAGRAM" : "WEBSITE";

  // ── Derived display values ─────────────────────────────────────────────────
  const customerName = isInstagram ? order.customerName : null;
  const customerPhone = isInstagram ? order.contactNumber : null;
  const address = isInstagram
    ? order.deliveryAddress
    : (order.deliveryAddress?.formattedAddress ?? null);
  const formattedAmount =
    typeof order.amount === "number"
      ? `₹${order.amount.toLocaleString()}`
      : "—";
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSubmitError(null);
  };

  const handlePresetChange = (name) => {
    setDimensionPreset(name);
    if (name && PRODUCT_DIMENSIONS[name]) {
      const d = PRODUCT_DIMENSIONS[name];
      setForm((f) => ({
        ...f,
        weight: String(d.weight),
        length: String(d.length),
        width: String(d.width),
        height: String(d.height),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const w = Number(form.weight);
    const l = Number(form.length);
    const wi = Number(form.width);
    const h = Number(form.height);

    if (!w || w <= 0) {
      setSubmitError("Weight must be a positive number (grams).");
      return;
    }
    if (!l || l <= 0) {
      setSubmitError("Length must be a positive number (cm).");
      return;
    }
    if (!wi || wi <= 0) {
      setSubmitError("Width must be a positive number (cm).");
      return;
    }
    if (!h || h <= 0) {
      setSubmitError("Height must be a positive number (cm).");
      return;
    }
    if (!form.warehouseId.trim()) {
      setSubmitError("Warehouse is required.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/admin/shipmozo/push-order", {
        orderId: order.orderId,
        orderType,
        warehouseId: form.warehouseId.trim(),
        paymentType: form.paymentType,
        weight: w,
        length: l,
        width: wi,
        height: h,
      });
      setSuccess(true);
      showToast("Shipment pushed to Shipmozo!", "success");
      setTimeout(() => navigate("/admin/shipments"), 2200);
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
          "Failed to create shipment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border border-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Shipment Created!
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Order <span className="font-mono">{order.orderId}</span> has been
            pushed to Shipmozo.
          </p>
          <p className="text-xs text-gray-400 mt-1.5">
            Redirecting to Shipments dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Create Shipment</h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {isInstagram ? (
                <Camera className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {isInstagram ? "Instagram" : "Website"}
            </span>
          </div>
          <p className="text-xs font-mono text-gray-400 mt-0.5">
            {order.orderId}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ══ Left column — order summary (read-only) ══ */}
          <div className="space-y-4">
            {/* Customer */}
            <SectionCard icon={User} title="Customer Details" badge="Read-only">
              <div className="space-y-3">
                {isInstagram ? (
                  <>
                    <InfoRow label="Customer Name" value={customerName} />
                    <InfoRow label="Phone" value={customerPhone} />
                  </>
                ) : (
                  <InfoRow label="Customer ID" value={order.userId} mono />
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Order date</p>
                  <p className="text-xs text-gray-600">{formattedDate}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Order value</p>
                  <p className="text-base font-semibold text-gray-900">
                    {formattedAmount}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Delivery address */}
            {address && (
              <SectionCard
                icon={MapPin}
                title="Delivery Address"
                badge="Read-only"
              >
                <p className="text-sm text-gray-600 leading-relaxed">
                  {address}
                </p>
              </SectionCard>
            )}

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <SectionCard
                icon={Package}
                title={`Items (${order.items.length})`}
                badge="Read-only"
              >
                <div className="space-y-3">
                  {order.items.map((item, idx) => {
                    const snap = item.productSnapshot ?? {};
                    const itemTotal =
                      typeof snap.priceAtPurchase === "number" &&
                      typeof snap.quantity === "number"
                        ? `₹${(snap.priceAtPurchase * snap.quantity).toLocaleString()}`
                        : null;
                    return (
                      <div
                        key={item.productId ?? idx}
                        className="flex items-center gap-3 pt-3 border-t border-gray-100 first:pt-0 first:border-0"
                      >
                        {snap.productImg ? (
                          <img
                            src={snap.productImg}
                            alt={snap.productName}
                            className="h-11 w-11 rounded-lg object-cover bg-gray-100 shrink-0 border border-gray-100"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {snap.productName ?? "Product"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Qty: {snap.quantity ?? 1}
                            {typeof snap.priceAtPurchase === "number" &&
                              ` · ₹${snap.priceAtPurchase.toLocaleString()} each`}
                          </p>
                        </div>
                        {itemTotal && (
                          <p className="text-sm font-medium text-gray-900 shrink-0">
                            {itemTotal}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ══ Right column — package form + action ══ */}
          <div className="space-y-4">
            <SectionCard icon={Box} title="Package Details">
              {/* Multi-product warning */}
              {distinctProducts.length > 1 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Order has {distinctProducts.length} different products —
                    verify dimensions before pushing.
                  </p>
                </div>
              )}

              {/* Payment type */}
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Payment Type
                </p>
                <div className="flex gap-2">
                  {["PREPAID", "COD"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange("paymentType", type)}
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

              {/* Weight */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Weight{" "}
                  <span className="font-normal text-gray-400">(grams)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={form.weight}
                  onChange={(e) => handleChange("weight", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Dimensions */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  Dimensions{" "}
                  <span className="font-normal text-gray-400">
                    (cm) — L × W × H
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { field: "length", label: "Length" },
                    { field: "width", label: "Width" },
                    { field: "height", label: "Height" },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-400 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* OR divider + autofill preset */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400">OR</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Select package to autofill dimensions
                </label>
                <select
                  value={dimensionPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">— select to pre-fill —</option>
                  {Object.entries(PRODUCT_DIMENSIONS).map(([name, d]) => (
                    <option key={name} value={name}>
                      {name} ({d.length} × {d.width} × {d.height}) cm
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Pickup Warehouse
                </label>
                {warehouses.length > 0 ? (
                  <select
                    value={form.warehouseId}
                    onChange={(e) =>
                      handleChange("warehouseId", e.target.value)
                    }
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {warehouses.map((w) => {
                      const id = String(w.id ?? w.warehouse_id ?? "");
                      const title = w.address_title ?? w.name ?? id;
                      const city = w.city ? ` · ${w.city}` : "";
                      return (
                        <option key={id} value={id}>
                          {title}
                          {city}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.warehouseId}
                    onChange={(e) =>
                      handleChange("warehouseId", e.target.value)
                    }
                    placeholder="Warehouse ID"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                )}
              </div>
            </SectionCard>

            {/* Error banner */}
            {submitError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pushing to Shipmozo…
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4" />
                  Push to Shipmozo
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              Customer and item details are auto-filled from your database. Only
              specify the physical package dimensions.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
