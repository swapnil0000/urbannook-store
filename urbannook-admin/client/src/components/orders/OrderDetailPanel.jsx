/**
 * OrderDetailPanel.jsx
 *
 * The actual order-detail content rendered as a plain scrollable div.
 * Used by:
 *   - OrderDetailDrawer (wrapped in a fixed slide-over overlay)
 *   - Management page (rendered inline in the right-hand column)
 */

import { useEffect, useState } from "react";
import {
  X,
  MapPin,
  CreditCard,
  Package,
  Globe,
  Camera,
  Pencil,
} from "lucide-react";
import OrderStatusBadge from "./OrderStatusBadge";
import ShipmentSection from "./ShipmentSection";
import EditOrderDrawer from "./EditOrderDrawer";
import apiClient from "../../api/axios";

function ChannelBadge({ isInstagram }) {
  if (isInstagram) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
        style={{ background: "#fce7f3", color: "#be185d" }}
      >
        <Camera className="h-3 w-3" />
        Instagram
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
      style={{ background: "#dbeafe", color: "#1d4ed8" }}
    >
      <Globe className="h-3 w-3" />
      Website
    </span>
  );
}

export default function OrderDetailPanel({ order, onClose, onOrderUpdated, className = "" }) {
  const [editOpen, setEditOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  // Fetch user data for website orders
  useEffect(() => {
    if (!order || order.customerName) {
      setUserData(null);
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/admin/users/${order.userId}`)
      .then((res) => { if (!cancelled) setUserData(res.data.data ?? null); })
      .catch(() => { if (!cancelled) setUserData(null); });
    return () => { cancelled = true; };
  }, [order?.userId, order?.customerName]);

  if (!order) return null;

  // _channel is set by useAllOrders; fallback to orderId prefix for direct opens
  const isInstagram = order._channel === "instagram" || order.orderId?.startsWith("IG-") || Boolean(order.customerName);

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString(undefined, {
          year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "—";

  const formattedDate      = fmt(order.createdAt);
  const formattedOrderedAt = order.orderedAt ? fmt(order.orderedAt) : null;
  const formattedAmount    =
    typeof order.amount === "number" ? `₹${order.amount.toLocaleString()}` : "—";

  return (
    <>
      <div
        className={`flex flex-col rounded-xl overflow-hidden ${className}`}
        style={{ background: "var(--color-urban-panel)", border: "1px solid var(--color-urban-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-urban-border)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold" style={{ color: "var(--color-urban-text)" }}>
                Order Details
              </h2>
              <ChannelBadge isInstagram={isInstagram} />
            </div>
            {order.orderId && (
              <p className="text-xs font-mono mt-0.5 break-all" style={{ color: "var(--color-urban-text-muted)" }}>
                {order.orderId}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-4 shrink-0">
            {isInstagram && (
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style={{
                  border: "1px solid var(--color-urban-border)",
                  color: "var(--color-urban-text-sec)",
                  background: "var(--color-urban-raised)",
                }}
              >
                <Pencil className="h-3.5 w-3.5" />Edit
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--color-urban-text-muted)" }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6" style={{ maxHeight: "calc(100vh - 160px)" }}>
          {/* Summary row */}
          <div
            className="flex flex-wrap items-center gap-3 pb-4"
            style={{ borderBottom: "1px solid var(--color-urban-border)" }}
          >
            {isInstagram ? (
              <div className="flex-1 min-w-0 space-y-1">
                {[
                  { label: "Customer Name", value: order.customerName && order.customerName !== "Pending" ? order.customerName : null },
                  { label: "Mobile", value: order.contactNumber },
                  { label: "Email", value: order.email },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <p className="text-xs mb-0.5" style={{ color: "var(--color-urban-text-muted)" }}>{label}</p>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-urban-text)" }}>{value}</p>
                  </div>
                ) : null)}
                {!order.contactNumber && !order.email && (
                  <p className="text-xs italic" style={{ color: "var(--color-urban-text-muted)" }}>
                    Customer details pending payment
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1 min-w-0 space-y-1">
                {userData?.name && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "var(--color-urban-text-muted)" }}>Customer Name</p>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-urban-text)" }}>{userData.name}</p>
                  </div>
                )}
                {userData?.email && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "var(--color-urban-text-muted)" }}>Email</p>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-urban-text)" }}>{userData.email}</p>
                  </div>
                )}
                {userData?.mobileNumber && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "var(--color-urban-text-muted)" }}>Mobile</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-urban-text)" }}>{userData.mobileNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "var(--color-urban-text-muted)" }}>Customer ID</p>
                  <p className="text-sm font-mono truncate" style={{ color: "var(--color-urban-text-sec)" }}>{order.userId || "—"}</p>
                </div>
              </div>
            )}
            <div className="text-right shrink-0">
              <p className="text-xs mb-0.5" style={{ color: "var(--color-urban-text-muted)" }}>Order Total</p>
              <p className="text-lg font-bold" style={{ color: "var(--color-urban-neon)" }}>{formattedAmount}</p>
            </div>
            <div className="w-full flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                {isInstagram && formattedOrderedAt && (
                  <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>
                    <span className="font-medium" style={{ color: "var(--color-urban-text-sec)" }}>Order date:</span>{" "}{formattedOrderedAt}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--color-urban-text-sec)" }}>
                    {isInstagram ? "Added:" : "Created:"}
                  </span>{" "}{formattedDate}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* Order items */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--color-urban-text)" }}>
                Items ({order.items?.length > 0 ? order.items.length : order.productName ? 1 : 0})
              </h3>
            </div>
            {/* Payment-link order — no items array, just productName */}
            {(!order.items || order.items.length === 0) && order.productName ? (
              <div
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ border: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-urban-text)" }}>
                    {order.productName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-urban-text-sec)" }}>
                    Payment link order
                  </p>
                </div>
                <p className="text-sm font-semibold shrink-0" style={{ color: "var(--color-urban-neon)" }}>
                  ₹{order.amount?.toLocaleString() ?? "—"}
                </p>
              </div>
            ) : !order.items || order.items.length === 0 ? (
              <p className="text-sm italic" style={{ color: "var(--color-urban-text-muted)" }}>No items recorded.</p>
            ) : (
              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const snap  = item.productSnapshot ?? {};
                  const price = typeof snap.priceAtPurchase === "number"
                    ? `₹${snap.priceAtPurchase.toLocaleString()}` : "—";
                  return (
                    <div
                      key={item.productId ?? idx}
                      className="flex items-center gap-3 rounded-lg p-3"
                      style={{ border: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}
                    >
                      {snap.productImg ? (
                        <img
                          src={snap.productImg}
                          alt={snap.productName ?? "Product"}
                          className="h-11 w-11 rounded-md object-cover shrink-0"
                          style={{ background: "var(--color-urban-border)" }}
                          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling?.classList.remove("hidden"); }}
                        />
                      ) : null}
                      <div
                        className={`h-11 w-11 rounded-md shrink-0 ${snap.productImg ? "hidden" : ""}`}
                        style={{ background: "var(--color-urban-border)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-urban-text)" }}>
                          {snap.productName ?? "Unknown product"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-urban-text-sec)" }}>
                          Qty: {snap.quantity ?? "—"} · {price}
                        </p>
                        {(snap.productCategory || snap.productSubCategory) && (
                          <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-urban-text-muted)" }}>
                            {[snap.productCategory, snap.productSubCategory].filter(Boolean).join(" › ")}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold shrink-0" style={{ color: "var(--color-urban-neon)" }}>
                        {typeof snap.priceAtPurchase === "number" && typeof snap.quantity === "number"
                          ? `₹${(snap.priceAtPurchase * snap.quantity).toLocaleString()}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Delivery address */}
          {(isInstagram ? order.deliveryAddress : order.deliveryAddress?.formattedAddress) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--color-urban-text)" }}>Delivery Address</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-urban-text-sec)" }}>
                {isInstagram ? order.deliveryAddress : order.deliveryAddress.formattedAddress}
              </p>
            </section>
          )}

          {/* Notes (Instagram only) */}
          {isInstagram && order.notes && (
            <section>
              <h3 className="text-sm font-bold mb-2" style={{ color: "var(--color-urban-text)" }}>Notes</h3>
              <p
                className="text-sm leading-relaxed rounded-lg p-3"
                style={{ background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" }}
              >
                {order.notes}
              </p>
            </section>
          )}

          {/* Payment details — website orders */}
          {!isInstagram && order.payment && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--color-urban-text)" }}>Payment Reference</h3>
              </div>
              <div
                className="rounded-lg p-4 space-y-2"
                style={{ background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)" }}
              >
                {[
                  { label: "Razorpay Order ID", value: order.payment.razorpayOrderId },
                  { label: "Payment ID",        value: order.payment.razorpayPaymentId },
                  { label: "Signature",         value: order.payment.razorpaySignature },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>{label}</p>
                      <p className="text-xs font-mono break-all" style={{ color: "var(--color-urban-text-sec)" }}>{value}</p>
                    </div>
                  ) : null,
                )}
                {!order.payment.razorpayOrderId && !order.payment.razorpayPaymentId && (
                  <p className="text-sm italic" style={{ color: "var(--color-urban-text-muted)" }}>No payment reference recorded.</p>
                )}
              </div>
            </section>
          )}

          {/* Payment details — Instagram orders */}
          {isInstagram && (order.razorpayOrderId || order.razorpayPaymentId) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--color-urban-text)" }}>Payment Reference</h3>
              </div>
              <div
                className="rounded-lg p-4 space-y-2"
                style={{ background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)" }}
              >
                {[
                  { label: "Razorpay Order ID", value: order.razorpayOrderId },
                  { label: "Payment ID",        value: order.razorpayPaymentId },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>{label}</p>
                      <p className="text-xs font-mono break-all" style={{ color: "var(--color-urban-text-sec)" }}>{value}</p>
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          )}

          {/* Shipment section */}
          {order.orderId && (
            <div className="pt-2" style={{ borderTop: "1px solid var(--color-urban-border)" }}>
              <ShipmentSection
                key={order.orderId}
                orderId={order.orderId}
                orderType={isInstagram ? "INSTAGRAM" : "WEBSITE"}
                order={order}
              />
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <EditOrderDrawer
          order={order}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            onOrderUpdated?.();
            onClose?.();
          }}
        />
      )}
    </>
  );
}
