import { useEffect, useRef, useCallback, useState } from "react";
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

// Instagram orders have customerName; website orders have userId
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

/**
 * Slide-over drawer that displays full order details.
 *
 * Animation strategy (no extra dependencies):
 *  - The drawer is mounted when `order` is truthy.
 *  - `visible` starts false; a rAF tick flips it true → CSS transition slides in.
 *  - On close: `visible` → false, a 300ms timeout matches the CSS transition
 *    duration before calling `onClose` (which sets selectedOrder = null → unmounts).
 */
export default function OrderDetailDrawer({ order, onClose, onOrderUpdated }) {
  const [visible, setVisible] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const closeTimerRef = useRef(null);
  const rafRef = useRef(null);

  // Fetch user data for website orders (read-only)
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    if (!order || order.customerName) {
      setUserData(null);
      return;
    } // Instagram — skip
    let cancelled = false;
    apiClient
      .get(`/admin/users/${order.userId}`)
      .then((res) => {
        if (!cancelled) setUserData(res.data.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.userId, order?.customerName]);

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

  const isInstagram = Boolean(order.customerName);

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
    typeof order.amount === "number"
      ? `₹${order.amount.toLocaleString()}`
      : "—";

  return (
    <>
      {/*   Backdrop     */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/*   Drawer panel      */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[520px] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--color-urban-panel)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: "1px solid var(--color-urban-border)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2
                className="text-base font-bold"
                style={{ color: "var(--color-urban-text)" }}
              >
                Order Details
              </h2>
              <ChannelBadge isInstagram={isInstagram} />
            </div>
            {order.orderId && (
              <p
                className="text-xs font-mono mt-0.5 break-all"
                style={{ color: "var(--color-urban-text-muted)" }}
              >
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
                aria-label="Edit order"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--color-urban-text-muted)" }}
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/*   Summary row     */}
          <div
            className="flex flex-wrap items-center gap-3 pb-4"
            style={{ borderBottom: "1px solid var(--color-urban-border)" }}
          >
            {isInstagram ? (
              <div className="flex-1 min-w-0 space-y-1">
                <div>
                  <p
                    className="text-xs mb-0.5"
                    style={{ color: "var(--color-urban-text-muted)" }}
                  >
                    Customer Name
                  </p>
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-urban-text)" }}
                  >
                    {order.customerName || "—"}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs mb-0.5"
                    style={{ color: "var(--color-urban-text-muted)" }}
                  >
                    Contact
                  </p>
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-urban-text)" }}
                  >
                    {order.contactNumber || "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0 space-y-1">
                {userData?.name && (
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      Customer Name
                    </p>
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-urban-text)" }}
                    >
                      {userData.name}
                    </p>
                  </div>
                )}
                {userData?.email && (
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      Email
                    </p>
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-urban-text)" }}
                    >
                      {userData.email}
                    </p>
                  </div>
                )}
                {userData?.mobileNumber && (
                  <div>
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      Mobile
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-urban-text)" }}
                    >
                      {userData.mobileNumber}
                    </p>
                  </div>
                )}
                <div>
                  <p
                    className="text-xs mb-0.5"
                    style={{ color: "var(--color-urban-text-muted)" }}
                  >
                    Customer ID
                  </p>
                  <p
                    className="text-sm font-mono truncate"
                    style={{ color: "var(--color-urban-text-sec)" }}
                  >
                    {order.userId || "—"}
                  </p>
                </div>
              </div>
            )}
            <div className="text-right shrink-0">
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--color-urban-text-muted)" }}
              >
                Order Total
              </p>
              <p
                className="text-lg font-bold"
                style={{ color: "var(--color-urban-neon)" }}
              >
                {formattedAmount}
              </p>
            </div>
            <div className="w-full flex items-center justify-between">
              <p
                className="text-xs"
                style={{ color: "var(--color-urban-text-muted)" }}
              >
                {formattedDate}
              </p>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/*   Order items     */}
          <section aria-label="Order items">
            <div className="flex items-center gap-2 mb-3">
              <Package
                className="h-4 w-4"
                style={{ color: "var(--color-urban-text-muted)" }}
              />
              <h3
                className="text-sm font-bold"
                style={{ color: "var(--color-urban-text)" }}
              >
                Items ({order.items?.length ?? 0})
              </h3>
            </div>

            {!order.items || order.items.length === 0 ? (
              <p
                className="text-sm italic"
                style={{ color: "var(--color-urban-text-muted)" }}
              >
                No items recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const snap = item.productSnapshot ?? {};
                  const price =
                    typeof snap.priceAtPurchase === "number"
                      ? `₹${snap.priceAtPurchase.toLocaleString()}`
                      : "—";

                  return (
                    <div
                      key={item.productId ?? idx}
                      className="flex items-center gap-4 rounded-lg p-3"
                      style={{
                        border: "1px solid var(--color-urban-border)",
                        background: "var(--color-urban-raised)",
                      }}
                    >
                      {snap.productImg ? (
                        <img
                          src={snap.productImg}
                          alt={snap.productName ?? "Product"}
                          className="h-12 w-12 rounded-md object-cover shrink-0"
                          style={{ background: "var(--color-urban-border)" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        className={`h-12 w-12 rounded-md shrink-0 ${snap.productImg ? "hidden" : ""}`}
                        style={{ background: "var(--color-urban-border)" }}
                      />

                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--color-urban-text)" }}
                        >
                          {snap.productName ?? "Unknown product"}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-urban-text-sec)" }}
                        >
                          Qty: {snap.quantity ?? "—"} · {price}
                        </p>
                        {(snap.productCategory || snap.productSubCategory) && (
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: "var(--color-urban-text-muted)" }}
                          >
                            {[snap.productCategory, snap.productSubCategory]
                              .filter(Boolean)
                              .join(" › ")}
                          </p>
                        )}
                      </div>

                      <p
                        className="text-sm font-semibold shrink-0"
                        style={{ color: "var(--color-urban-neon)" }}
                      >
                        {typeof snap.priceAtPurchase === "number" &&
                        typeof snap.quantity === "number"
                          ? `₹${(snap.priceAtPurchase * snap.quantity).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/*   Delivery address     */}
          {(isInstagram
            ? order.deliveryAddress
            : order.deliveryAddress?.formattedAddress) && (
            <section aria-label="Delivery address">
              <div className="flex items-center gap-2 mb-3">
                <MapPin
                  className="h-4 w-4"
                  style={{ color: "var(--color-urban-text-muted)" }}
                />
                <h3
                  className="text-sm font-bold"
                  style={{ color: "var(--color-urban-text)" }}
                >
                  Delivery Address
                </h3>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-urban-text-sec)" }}
              >
                {isInstagram
                  ? order.deliveryAddress
                  : order.deliveryAddress.formattedAddress}
              </p>
            </section>
          )}

          {/*   Notes (Instagram orders only)     */}
          {isInstagram && order.notes && (
            <section aria-label="Order notes">
              <h3
                className="text-sm font-bold mb-2"
                style={{ color: "var(--color-urban-text)" }}
              >
                Notes
              </h3>
              <p
                className="text-sm leading-relaxed rounded-lg p-3"
                style={{
                  background: "var(--color-urban-raised)",
                  color: "var(--color-urban-text-sec)",
                }}
              >
                {order.notes}
              </p>
            </section>
          )}

          {/*   Payment details     */}
          {order.payment && (
            <section aria-label="Payment details">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard
                  className="h-4 w-4"
                  style={{ color: "var(--color-urban-text-muted)" }}
                />
                <h3
                  className="text-sm font-bold"
                  style={{ color: "var(--color-urban-text)" }}
                >
                  Payment Reference
                </h3>
              </div>
              <div
                className="rounded-lg p-4 space-y-2"
                style={{
                  background: "var(--color-urban-raised)",
                  border: "1px solid var(--color-urban-border)",
                }}
              >
                {[
                  {
                    label: "Razorpay Order ID",
                    value: order.payment.razorpayOrderId,
                  },
                  {
                    label: "Payment ID",
                    value: order.payment.razorpayPaymentId,
                  },
                  {
                    label: "Signature",
                    value: order.payment.razorpaySignature,
                  },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-urban-text-muted)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-xs font-mono break-all"
                        style={{ color: "var(--color-urban-text-sec)" }}
                      >
                        {value}
                      </p>
                    </div>
                  ) : null,
                )}
                {!order.payment.razorpayOrderId &&
                  !order.payment.razorpayPaymentId && (
                    <p
                      className="text-sm italic"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      No payment reference recorded.
                    </p>
                  )}
              </div>
            </section>
          )}

          {/*   Shipment (Shipmozo)     */}
          {order.orderId && (
            <div
              className="pt-2"
              style={{ borderTop: "1px solid var(--color-urban-border)" }}
            >
              <ShipmentSection
                key={order.orderId}
                orderId={order.orderId}
                orderType={isInstagram ? "INSTAGRAM" : "WEBSITE"}
                order={order}
              />
            </div>
          )}
        </div>
      </aside>

      {editOpen && (
        <EditOrderDrawer
          order={order}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            onOrderUpdated?.();
            handleClose();
          }}
        />
      )}
    </>
  );
}
