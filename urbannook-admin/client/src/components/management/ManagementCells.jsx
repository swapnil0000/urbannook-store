/**
 * ManagementCells.jsx
 *
 * Shared display sub-components used across all Management tables:
 *   - OrderIdCell   : source icon + truncated order ID
 *   - StatusBadge   : coloured pill for shipment status
 *   - DispatchButton: per-row action button in the Active Shipments table
 */

import { Instagram, Globe, CheckCircle2, Clock, MailX, Loader2, PackageCheck, AlertCircle } from "lucide-react";
import { STATUS_LABELS, PICKUP_STATUSES } from "./managementConstants";

// ── Helpers ───────────────────────────────────────────────────────────────────

export const shortId    = (id) => (id ? `${id.slice(0, 7)}…` : "—");
export const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

export function productSummary(items = []) {
  if (!items?.length) return "—";
  return items
    .map((item) => {
      const name = item.productSnapshot?.productName || "Product";
      const qty  = item.productSnapshot?.quantity || 1;
      return qty > 1 ? `${name} ×${qty}` : name;
    })
    .join(", ");
}

// ── OrderIdCell ───────────────────────────────────────────────────────────────

export function OrderIdCell({ orderId, source }) {
  const isIG = source === "INSTAGRAM";
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={orderId}>
      {isIG
        ? <Instagram className="h-3 w-3 shrink-0" style={{ color: "#be185d" }} />
        : <Globe     className="h-3 w-3 shrink-0" style={{ color: "#1d4ed8" }} />}
      <span className="font-mono text-xs font-semibold" style={{ color: "var(--color-urban-text)" }}>
        {shortId(orderId)}
      </span>
    </span>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

export function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ── DispatchButton ─────────────────────────────────────────────────────────────
//
// rowState: "idle"|"loading"|"dispatched"|"not_yet"|"no_awb"|"error"

export function DispatchButton({ shipment, rowState, alreadyConfirmed, onCheck }) {
  if (alreadyConfirmed) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg"
        style={{ background: "#dcfce7", color: "#166534" }}
      >
        <CheckCircle2 className="h-3 w-3" />Done
        {shipment.sourceOrderType === "INSTAGRAM" && (
          <MailX className="h-3 w-3 opacity-60 ml-0.5" title="IG — no email" />
        )}
      </span>
    );
  }

  if (rowState === "not_yet") {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
          style={{ background: "#fef9c3", color: "#854d0e" }}
        >
          <Clock className="h-3 w-3" />Not yet
        </span>
        <button
          onClick={() => onCheck(shipment)}
          className="text-[10px] underline"
          style={{ color: "var(--color-urban-text-muted)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (rowState === "no_awb") {
    return (
      <span className="text-[10px] italic" style={{ color: "var(--color-urban-text-muted)" }}>
        No AWB
      </span>
    );
  }

  if (rowState === "error") {
    return (
      <button
        onClick={() => onCheck(shipment)}
        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg"
        style={{ background: "#fee2e2", color: "#991b1b" }}
      >
        <AlertCircle className="h-3 w-3" />Retry
      </button>
    );
  }

  // Only show the "Check" button for shipments still in the pickup phase
  if (!PICKUP_STATUSES.has(shipment.shipmentStatus)) return null;

  const isLoading = rowState === "loading";
  return (
    <button
      onClick={() => onCheck(shipment)}
      disabled={isLoading}
      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg transition-all disabled:opacity-60"
      style={{
        background: "var(--color-urban-raised)",
        color: isLoading ? "var(--color-urban-text-muted)" : "var(--color-urban-neon)",
        border: "1px solid var(--color-urban-border)",
      }}
    >
      {isLoading
        ? <><Loader2 className="h-3 w-3 animate-spin" />…</>
        : <><PackageCheck className="h-3 w-3" />Check</>}
    </button>
  );
}
