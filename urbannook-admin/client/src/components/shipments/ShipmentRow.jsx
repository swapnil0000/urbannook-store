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

  const src = shipment._sourceOrder;
  const isInstagram = shipment.sourceOrderType === "INSTAGRAM";

  // Compute menu position relative to viewport on open
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top:   rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isMenuOpen]);

  // Click-outside to close
  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        onCloseMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMenuOpen, onCloseMenu]);

  // Product summary from source order items
  const items = src?.items ?? [];
  const firstItemName =
    items[0]?.productSnapshot?.productName ??
    items[0]?.name ??
    null;
  const productSummary = firstItemName
    ? items.length > 1
      ? `${firstItemName} +${items.length - 1} more`
      : firstItemName
    : "—";

  // Customer info
  const customerName = isInstagram
    ? (src?.customerName || "—")
    : (src?.userId ? `User ${src.userId.slice(-6)}` : "Website Order");
  const customerPhone = isInstagram ? (src?.contactNumber || null) : null;

  // Conditional action menu items
  const canAssign = shipment.shipmentStatus === "PUSHED";
  const canLabel  = Boolean(shipment.awbNumber);
  const canTrack  = Boolean(shipment.awbNumber);
  const canCancel = !shipment.isCancelled && !NON_CANCELLABLE.has(shipment.shipmentStatus);

  const hasAnyAction = canAssign || canLabel || canTrack || canCancel;

  return (
    <tr
      className="border-b transition-colors"
      style={{ borderColor: "#1E1E1E", backgroundColor: "#111111" }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1A1A1A"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#111111"; }}
    >
      {/* Order Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs text-gray-300">{formatDate(shipment.createdAt)}</p>
        <p className="text-xs text-gray-500 mt-0.5">{formatTime(shipment.createdAt)}</p>
      </td>

      {/* Order Details */}
      <td className="px-4 py-3 max-w-[180px]">
        <div className="flex items-center gap-1.5 mb-1">
          {isInstagram
            ? <Camera className="h-3 w-3 text-pink-400 shrink-0" />
            : <Globe   className="h-3 w-3 text-blue-400 shrink-0" />
          }
          <p className="text-xs font-mono text-gray-300 truncate">{shipment.sourceOrderId}</p>
        </div>
        <ShipmentStatusBadge status={shipment.shipmentStatus} />
      </td>

      {/* Product Details */}
      <td className="px-4 py-3 max-w-[160px]">
        <p className="text-xs text-gray-300 truncate">{productSummary}</p>
        {items.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        )}
      </td>

      {/* Package Details */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs text-gray-300">{shipment.weight}g</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {shipment.length}×{shipment.width}×{shipment.height} cm
        </p>
      </td>

      {/* Payment */}
      <td className="px-4 py-3 whitespace-nowrap">
        {shipment.paymentType === "PREPAID" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: "#1C2A1C", color: "#4ade80" }}>
            Prepaid
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: "#2A2310", color: "#facc15" }}>
            COD
          </span>
        )}
      </td>

      {/* Shipping Details */}
      <td className="px-4 py-3 max-w-[180px]">
        <p className="text-xs text-gray-300 truncate">{customerName}</p>
        {customerPhone && (
          <p className="text-xs text-gray-500 mt-0.5">{customerPhone}</p>
        )}
        {shipment.awbNumber && (
          <p className="text-xs font-mono text-gray-500 mt-1 truncate">{shipment.awbNumber}</p>
        )}
        {shipment.courierCompany && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">{shipment.courierCompany}</p>
        )}
      </td>

      {/* Pickup Address */}
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs text-gray-500">WH: {shipment.warehouseId}</p>
        {shipment.pickupPincode && (
          <p className="text-xs text-gray-600 mt-0.5">PIN: {shipment.pickupPincode}</p>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {hasAnyAction && (
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => onOpenMenu(shipment._id)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-colors"
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Dropdown — rendered via portal-like fixed positioning */}
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="fixed z-[9999] min-w-[168px] rounded-lg shadow-2xl py-1 border"
                style={{
                  top:             menuPos.top,
                  right:           menuPos.right,
                  backgroundColor: "#1A1A1A",
                  borderColor:     "#2A2A2A",
                }}
              >
                {canAssign && (
                  <button
                    onClick={() => { onCloseMenu(); onAssign(shipment); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <Truck className="h-4 w-4 text-gray-400" />
                    Assign Courier
                  </button>
                )}
                {canLabel && (
                  <button
                    onClick={() => { onCloseMenu(); onPrintLabel(shipment); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <Printer className="h-4 w-4 text-gray-400" />
                    Print Label
                  </button>
                )}
                {canTrack && (
                  <button
                    onClick={() => { onCloseMenu(); onTrack(shipment); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-gray-400" />
                    Track Package
                  </button>
                )}
                {canCancel && (
                  <>
                    {(canAssign || canLabel || canTrack) && (
                      <div className="my-1 border-t" style={{ borderColor: "#2A2A2A" }} />
                    )}
                    <button
                      onClick={() => { onCloseMenu(); onCancel(shipment); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                    >
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
