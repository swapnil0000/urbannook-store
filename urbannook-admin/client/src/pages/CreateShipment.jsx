import { useState } from "react";
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

// Known warehouse locations — keyed by Shipmozo warehouse ID
const WAREHOUSE_INFO = {
  109337: {
    name: "Urban Nook",
    tag: "Home pickup",
    address:
      "3rd floor 740 sector 51 samaspur village, Gurgaon, Haryana, India, 122003",
  },
};

function WarehouseCard({ info }) {
  return (
    <div
      className="relative mt-2.5 rounded-xl px-4 py-3.5"
      style={{
        border: "1.5px solid var(--color-urban-neon)",
        background:
          "color-mix(in srgb, var(--color-urban-neon) 6%, transparent)",
      }}
    >
      {/* Selected tick */}
      <div
        className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: "var(--color-urban-neon)" }}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--color-urban-neon) 15%, transparent)",
            color: "var(--color-urban-neon)",
          }}
        >
          {info.tag}
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: "var(--color-urban-raised)",
            color: "var(--color-urban-text-muted)",
            border: "1px solid var(--color-urban-border)",
          }}
        >
          Default
        </span>
      </div>

      <p
        className="text-sm font-bold"
        style={{ color: "var(--color-urban-text)" }}
      >
        {info.name}
      </p>
      <p
        className="text-xs mt-0.5 leading-relaxed"
        style={{ color: "var(--color-urban-text-sec)" }}
      >
        {info.address}
      </p>
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div>
      <p
        className="text-xs mb-0.5"
        style={{ color: "var(--color-urban-text-muted)" }}
      >
        {label}
      </p>
      <p
        className={`text-sm ${mono ? "font-mono break-all" : "font-medium"}`}
        style={{ color: "var(--color-urban-text)" }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function SectionCard({ icon: Icon, title, badge, children }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--color-urban-surface)",
        border: "1px solid var(--color-urban-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon
          className="h-4 w-4"
          style={{ color: "var(--color-urban-text-muted)" }}
        />
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--color-urban-text-sec)" }}
        >
          {title}
        </h2>
        {badge && (
          <span
            className="ml-auto text-xs italic"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
            {badge}
          </span>
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
      weight: dims ? String(dims.weight) : "1000",
      length: dims ? String(dims.length) : "27",
      width: dims ? String(dims.width) : "26",
      height: dims ? String(dims.height) : "12",
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

  // No order in state means user navigated directly via URL — send them to Orders
  if (!order) {
    return <Navigate to="/admin/orders" replace />;
  }

  const isInstagram = Boolean(order.customerName);
  const orderType = isInstagram ? "INSTAGRAM" : "WEBSITE";

  // ── Derived display values ──
  const customerName = isInstagram ? order.customerName : null;
  const customerPhone = isInstagram ? order.contactNumber : null;
  const address = isInstagram
    ? order.deliveryAddress
    : (order.deliveryAddress?.formattedAddress ?? null);
  const formattedAmount =
    typeof order.amount === "number"
      ? `₹${order.amount.toLocaleString()}`
      : "—";
  const rawOrderDate = isInstagram ? (order.orderedAt || order.createdAt) : order.createdAt;
  const formattedDate = rawOrderDate
    ? new Date(rawOrderDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  // ── Handlers ──────────────
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

  // ── Success screen ─────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "#dcfce7", border: "1px solid #86efac" }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: "#15803d" }} />
        </div>
        <div className="text-center">
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--color-urban-text)" }}
          >
            Shipment Created!
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-urban-text-sec)" }}
          >
            Order <span className="font-mono">{order.orderId}</span> has been
            pushed to Shipmozo.
          </p>
          <p
            className="text-xs mt-1.5"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
            Redirecting to Shipments dashboard…
          </p>
        </div>
      </div>
    );
  }

  // ── Main page ──────────────
  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg transition-colors shrink-0"
          style={{
            color: "var(--color-urban-text-muted)",
            background: "var(--color-urban-raised)",
            border: "1px solid var(--color-urban-border)",
          }}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--color-urban-text)" }}
            >
              Create Shipment
            </h1>
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-urban-raised)",
                color: "var(--color-urban-text-sec)",
                border: "1px solid var(--color-urban-border)",
              }}
            >
              {isInstagram ? (
                <Camera className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {isInstagram ? "Instagram" : "Website"}
            </span>
          </div>
          <p
            className="text-xs font-mono mt-0.5"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
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
                <div
                  className="flex items-center justify-between pt-2"
                  style={{ borderTop: "1px solid var(--color-urban-border)" }}
                >
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-urban-text-muted)" }}
                  >
                    Order date
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-urban-text-sec)" }}
                  >
                    {formattedDate}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-urban-text-muted)" }}
                  >
                    Order value
                  </p>
                  <p
                    className="text-base font-semibold"
                    style={{ color: "var(--color-urban-neon)" }}
                  >
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
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-urban-text-sec)" }}
                >
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
                        className="flex items-center gap-3 pt-3 first:pt-0"
                        style={{
                          borderTop:
                            idx === 0
                              ? "none"
                              : "1px solid var(--color-urban-border)",
                        }}
                      >
                        {snap.productImg ? (
                          <img
                            src={snap.productImg}
                            alt={snap.productName}
                            className="h-11 w-11 rounded-lg object-cover shrink-0"
                            style={{
                              border: "1px solid var(--color-urban-border)",
                              background: "var(--color-urban-raised)",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className="h-11 w-11 rounded-lg shrink-0"
                            style={{
                              background: "var(--color-urban-raised)",
                              border: "1px solid var(--color-urban-border)",
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: "var(--color-urban-text)" }}
                          >
                            {snap.productName ?? "Product"}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "var(--color-urban-text-muted)" }}
                          >
                            Qty: {snap.quantity ?? 1}
                            {typeof snap.priceAtPurchase === "number" &&
                              ` · ₹${snap.priceAtPurchase.toLocaleString()} each`}
                          </p>
                        </div>
                        {itemTotal && (
                          <p
                            className="text-sm font-semibold shrink-0"
                            style={{ color: "var(--color-urban-neon)" }}
                          >
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
                <div
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4"
                  style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
                >
                  <AlertTriangle
                    className="h-4 w-4 shrink-0 mt-0.5"
                    style={{ color: "#d97706" }}
                  />
                  <p className="text-xs" style={{ color: "#92400e" }}>
                    Order has {distinctProducts.length} different products —
                    verify dimensions before pushing.
                  </p>
                </div>
              )}

              {/* Payment type */}
              <div className="mb-5">
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: "var(--color-urban-text-sec)" }}
                >
                  Payment Type
                </p>
                <div className="flex gap-2">
                  {["PREPAID", "COD"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange("paymentType", type)}
                      className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={
                        form.paymentType === type
                          ? {
                              background: "var(--gradient-urban-accent)",
                              color: "#fff",
                              border: "1px solid transparent",
                            }
                          : {
                              background: "var(--color-urban-raised)",
                              color: "var(--color-urban-text-sec)",
                              border: "1px solid var(--color-urban-border)",
                            }
                      }
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight + Dimensions — single row */}
              <div className="mb-4">
                <p
                  className="text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-urban-text-sec)" }}
                >
                  Weight &amp; Dimensions
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { field: "weight", label: "Weight (g)" },
                    { field: "length", label: "Length (cm)" },
                    { field: "width", label: "Width (cm)" },
                    { field: "height", label: "Height (cm)" },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label
                        className="block text-xs mb-1"
                        style={{ color: "var(--color-urban-text-muted)" }}
                      >
                        {label}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                        style={{
                          border: "1px solid var(--color-urban-border)",
                          background: "var(--color-urban-raised)",
                          color: "var(--color-urban-text)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* OR divider + autofill preset */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex-1 h-px"
                    style={{ background: "var(--color-urban-border)" }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--color-urban-text-muted)" }}
                  >
                    OR
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: "var(--color-urban-border)" }}
                  />
                </div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-urban-text-sec)" }}
                >
                  Select package to autofill dimensions
                </label>
                <select
                  value={dimensionPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                  style={{
                    border: "1px solid var(--color-urban-border)",
                    background: "var(--color-urban-raised)",
                    color: "var(--color-urban-text)",
                  }}
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
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--color-urban-text-sec)" }}
                >
                  Pickup Warehouse
                </label>
                <input
                  type="text"
                  value={form.warehouseId}
                  onChange={(e) => handleChange("warehouseId", e.target.value)}
                  placeholder="Warehouse ID"
                  className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                  style={{
                    border: "1px solid var(--color-urban-border)",
                    background: "var(--color-urban-raised)",
                    color: "var(--color-urban-text)",
                  }}
                />
                {/* Location card — shown when the entered ID maps to a known warehouse */}
                {WAREHOUSE_INFO[form.warehouseId] && (
                  <WarehouseCard info={WAREHOUSE_INFO[form.warehouseId]} />
                )}
              </div>
            </SectionCard>

            {/* Error banner */}
            {submitError && (
              <div
                className="flex items-start gap-2 text-sm rounded-xl px-4 py-3"
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#b91c1c",
                }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "var(--gradient-urban-accent)" }}
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

            <p
              className="text-xs text-center"
              style={{ color: "var(--color-urban-text-muted)" }}
            >
              Customer and item details are auto-filled from your database. Only
              specify the physical package dimensions.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
