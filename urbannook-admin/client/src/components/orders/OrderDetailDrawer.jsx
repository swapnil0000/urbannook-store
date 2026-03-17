import { useEffect, useRef, useCallback, useState } from "react";
import { X, MapPin, CreditCard, Package } from "lucide-react";
import OrderStatusBadge from "./OrderStatusBadge";

/**
 * Slide-over drawer that displays full order details.
 *
 * Animation strategy (no extra dependencies):
 *  - The drawer is mounted when `order` is truthy.
 *  - `visible` starts false; a rAF tick flips it true → CSS transition slides in.
 *  - On close: `visible` → false, a 300ms timeout matches the CSS transition
 *    duration before calling `onClose` (which sets selectedOrder = null → unmounts).
 */
export default function OrderDetailDrawer({ order, onClose }) {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef(null);
  const rafRef = useRef(null);

  // Slide in once mounted
  useEffect(() => {
    if (order) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [order]);

  // Animate out, then call onClose after transition completes
  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimerRef.current = setTimeout(onClose, 300); // match CSS duration-300
  }, [onClose]);

  // Escape key closes the drawer
  useEffect(() => {
    if (!order) return;
    const handler = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [order, handleClose]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!order) return null;

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const formattedAmount =
    typeof order.amount === "number" ? `$${order.amount.toFixed(2)}` : "—";

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ─────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Order Details
            </h2>
            {order.orderId && (
              <p className="text-xs font-mono text-gray-400 mt-0.5 break-all">
                {order.orderId}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-4 shrink-0"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Summary row ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Customer ID</p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {order.userId || "—"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 mb-0.5">Order Total</p>
              <p className="text-lg font-semibold text-gray-900">
                {formattedAmount}
              </p>
            </div>
            <div className="w-full flex items-center justify-between">
              <p className="text-xs text-gray-400">{formattedDate}</p>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* ── Order items ──────────────────────────────────────────────── */}
          <section aria-label="Order items">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">
                Items ({order.items?.length ?? 0})
              </h3>
            </div>

            {!order.items || order.items.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No items recorded.</p>
            ) : (
              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const snap = item.productSnapshot ?? {};
                  const price =
                    typeof snap.priceAtPurchase === "number"
                      ? `$${snap.priceAtPurchase.toFixed(2)}`
                      : "—";

                  return (
                    <div
                      key={item.productId ?? idx}
                      className="flex items-center gap-4 border border-gray-100 rounded-lg p-3"
                    >
                      {snap.productImg ? (
                        <img
                          src={snap.productImg}
                          alt={snap.productName ?? "Product"}
                          className="h-12 w-12 rounded-md object-cover bg-gray-100 shrink-0"
                          onError={(e) => {
                            // Replace broken image with a neutral placeholder div
                            e.target.style.display = "none";
                            e.target.nextSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      {/* Placeholder shown when image fails or is absent */}
                      <div
                        className={`h-12 w-12 rounded-md bg-gray-100 shrink-0 ${
                          snap.productImg ? "hidden" : ""
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {snap.productName ?? "Unknown product"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Qty: {snap.quantity ?? "—"} · {price}
                        </p>
                        {(snap.productCategory || snap.productSubCategory) && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {[snap.productCategory, snap.productSubCategory]
                              .filter(Boolean)
                              .join(" › ")}
                          </p>
                        )}
                      </div>

                      <p className="text-sm font-medium text-gray-900 shrink-0">
                        {typeof snap.priceAtPurchase === "number" &&
                        typeof snap.quantity === "number"
                          ? `$${(snap.priceAtPurchase * snap.quantity).toFixed(2)}`
                          : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Delivery address ─────────────────────────────────────────── */}
          {order.deliveryAddress?.formattedAddress && (
            <section aria-label="Delivery address">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Delivery Address
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {order.deliveryAddress.formattedAddress}
              </p>
            </section>
          )}

          {/* ── Payment details ──────────────────────────────────────────── */}
          {order.payment && (
            <section aria-label="Payment details">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Payment Reference
                </h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {[
                  { label: "Razorpay Order ID", value: order.payment.razorpayOrderId },
                  { label: "Payment ID", value: order.payment.razorpayPaymentId },
                  { label: "Signature", value: order.payment.razorpaySignature },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-xs font-mono text-gray-700 break-all">{value}</p>
                    </div>
                  ) : null
                )}
                {/* Edge case: payment exists but all IDs are empty */}
                {!order.payment.razorpayOrderId &&
                  !order.payment.razorpayPaymentId && (
                    <p className="text-sm text-gray-400 italic">
                      No payment reference recorded.
                    </p>
                  )}
              </div>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
