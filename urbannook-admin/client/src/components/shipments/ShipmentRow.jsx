import { useRef, useEffect, useState } from "react";
import { Camera, Globe, MoreVertical, Truck, Printer, MapPin, XCircle } from "lucide-react";
import ShipmentStatusBadge from "./ShipmentStatusBadge";

const NON_CANCELLABLE = new Set(["DELIVERED", "CANCELLED", "RTO_DELIVERED"]);

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function ShipmentRow({
  shipment,
  isMenuOpen,
  onOpenMenu,
  onAssign,
  onPrintLabel,
  onTrack,
  onCancel,
  onCloseMenu,
}) {
  const menuRef    = useRef(null);
  const buttonRef  = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const src         = shipment._sourceOrder;
  const isInstagram = shipment.sourceOrderType === "INSTAGRAM";

  // Compute menu position relative to viewport on open
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [isMenuOpen]);

  // Click-outside to close
  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) onCloseMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMenuOpen, onCloseMenu]);

  // ── Customer info ─────────────────────────────────────────────────────────
  // Instagram: customerName + contactNumber
  // Website: userName (top-level DB field) or deliveryAddress.fullName fallback
  const customerName = isInstagram
    ? (src?.customerName || "—")
    : (src?.userName || src?.deliveryAddress?.fullName || src?.userEmail?.split("@")[0] || "—");

  const customerPhone = isInstagram
    ? (src?.contactNumber || null)
    : (src?.userMobile ? String(src.userMobile) : null);

  // ── Delivery address ──────────────────────────────────────────────────────
  // Website orders have structured deliveryAddress with city/state/pinCode
  // Instagram orders store deliveryAddress as a plain string
  let deliveryLine1 = null;
  let deliveryLine2 = shipment.deliveryPincode ? `PIN: ${shipment.deliveryPincode}` : null;

  if (isInstagram) {
    // String address — show first ~40 chars
    const raw = typeof src?.deliveryAddress === "string" ? src.deliveryAddress : null;
    deliveryLine1 = raw ? raw.slice(0, 45) + (raw.length > 45 ? "…" : "") : null;
  } else {
    const addr = src?.deliveryAddress;
    const city  = addr?.city  || null;
    const state = addr?.state || null;
    if (city && state) deliveryLine1 = `${city}, ${state}`;
    else if (city || state) deliveryLine1 = city || state;
    if (addr?.pinCode) deliveryLine2 = `PIN: ${addr.pinCode}`;
  }

  // ── Product summary ───────────────────────────────────────────────────────
  const items = src?.items ?? [];
  const firstItemName = items[0]?.productSnapshot?.productName ?? items[0]?.name ?? null;
  const productSummary = firstItemName
    ? items.length > 1 ? `${firstItemName} +${items.length - 1} more` : firstItemName
    : "—";

  // ── Action availability ───────────────────────────────────────────────────
  const canAssign = shipment.shipmentStatus === "PUSHED";
  const canLabel  = Boolean(shipment.awbNumber);
  const canTrack  = Boolean(shipment.awbNumber);
  const canCancel = !shipment.isCancelled && !NON_CANCELLABLE.has(shipment.shipmentStatus);
  const hasAnyAction = canAssign || canLabel || canTrack || canCancel;

  return (
    <tr
      className="transition-colors"
      style={{ borderTop: "1px solid var(--color-urban-border)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--color-urban-neon) 4%, transparent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Order Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs font-medium" style={{ color: "var(--color-urban-text)" }}>{formatDate(shipment.createdAt)}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-urban-text-muted)" }}>{formatTime(shipment.createdAt)}</p>
      </td>

      {/* Order Details */}
      <td className="px-4 py-3 max-w-[180px]">
        <div className="flex items-center gap-1.5 mb-1">
          {isInstagram
            ? <Camera className="h-3 w-3 text-pink-400 shrink-0" />
            : <Globe   className="h-3 w-3 text-blue-400 shrink-0" />}
          <p className="text-xs font-mono truncate" style={{ color: "var(--color-urban-text-sec)" }}>
            {shipment.sourceOrderId}
          </p>
        </div>
        <ShipmentStatusBadge status={shipment.shipmentStatus} />
      </td>

      {/* Customer */}
      <td className="px-4 py-3 max-w-[160px]">
        <p className="text-xs font-medium truncate" style={{ color: "var(--color-urban-text)" }}>{customerName}</p>
        {customerPhone && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-urban-text-sec)" }}>{customerPhone}</p>
        )}
        {deliveryLine1 && (
          <p className="text-xs mt-1 truncate" style={{ color: "var(--color-urban-text-muted)" }}>{deliveryLine1}</p>
        )}
        {deliveryLine2 && (
          <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>{deliveryLine2}</p>
        )}
      </td>

      {/* Product Details */}
      <td className="px-4 py-3 max-w-[150px]">
        <p className="text-xs truncate" style={{ color: "var(--color-urban-text)" }}>{productSummary}</p>
        {items.length > 0 && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-urban-text-muted)" }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        )}
      </td>

      {/* Package Details */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs" style={{ color: "var(--color-urban-text)" }}>{shipment.weight}g</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-urban-text-muted)" }}>
          {shipment.length}×{shipment.width}×{shipment.height} cm
        </p>
      </td>

      {/* Payment */}
      <td className="px-4 py-3 whitespace-nowrap">
        {shipment.paymentType === "PREPAID" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase"
            style={{ background: "#dcfce7", color: "#15803d" }}>Prepaid</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase"
            style={{ background: "#fef9c3", color: "#92400e" }}>COD</span>
        )}
      </td>

      {/* Courier Info */}
      <td className="px-4 py-3 max-w-[160px]">
        {shipment.awbNumber ? (
          <>
            <p className="text-xs font-mono truncate" style={{ color: "var(--color-urban-text)" }}>{shipment.awbNumber}</p>
            {shipment.courierCompany && (
              <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-urban-text-sec)" }}>{shipment.courierCompany}</p>
            )}
          </>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>—</p>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {hasAnyAction && (
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => onOpenMenu(shipment._id)}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "var(--color-urban-text-muted)" }}
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                className="fixed z-[9999] min-w-[168px] rounded-lg shadow-2xl py-1"
                style={{
                  top: menuPos.top, right: menuPos.right,
                  background: "var(--color-urban-surface)",
                  border: "1px solid var(--color-urban-border)",
                }}
              >
                {canAssign && (
                  <button onClick={() => { onCloseMenu(); onAssign(shipment); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: "var(--color-urban-text)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-urban-raised)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <Truck className="h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
                    Assign Courier
                  </button>
                )}
                {canLabel && (
                  <button onClick={() => { onCloseMenu(); onPrintLabel(shipment); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: "var(--color-urban-text)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-urban-raised)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <Printer className="h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
                    Print Label
                  </button>
                )}
                {canTrack && (
                  <button onClick={() => { onCloseMenu(); onTrack(shipment); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: "var(--color-urban-text)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-urban-raised)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <MapPin className="h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
                    Track Package
                  </button>
                )}
                {canCancel && (
                  <>
                    {(canAssign || canLabel || canTrack) && (
                      <div className="my-1" style={{ borderTop: "1px solid var(--color-urban-border)" }} />
                    )}
                    <button onClick={() => { onCloseMenu(); onCancel(shipment); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                      style={{ color: "#ef4444" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-urban-raised)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <XCircle className="h-4 w-4" />
                      Cancel Shipment
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
