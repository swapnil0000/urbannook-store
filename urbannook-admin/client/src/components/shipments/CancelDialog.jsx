import { AlertTriangle, Loader2, AlertCircle } from "lucide-react";

export default function CancelDialog({ state, onConfirm, onClose }) {
  if (!state.open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      {/* Dialog */}
      <div
        className="rounded-xl shadow-2xl w-full max-w-sm p-6"
        style={{ background: "var(--color-urban-panel)", border: "1px solid var(--color-urban-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, #ef4444 12%, transparent)" }}
          >
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--color-urban-text)" }}>Cancel Shipment</h3>
            <p className="text-sm mt-1" style={{ color: "var(--color-urban-text-sec)" }}>This action cannot be undone.</p>
          </div>
        </div>

        {/* Order reference */}
        {state.shipment && (
          <div
            className="rounded-lg px-3 py-2 mb-4"
            style={{ background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)" }}
          >
            <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>Order</p>
            <p className="text-sm font-mono mt-0.5" style={{ color: "var(--color-urban-text-sec)" }}>{state.shipment.sourceOrderId}</p>
          </div>
        )}

        {/* Inline error */}
        {state.error && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg mb-4"
            style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}
          >
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{state.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={state.loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              border: "1px solid var(--color-urban-border)",
              color: "var(--color-urban-text-sec)",
              background: "var(--color-urban-raised)",
            }}
          >
            Keep Shipment
          </button>
          <button
            onClick={() => onConfirm(state.shipment._id)}
            disabled={state.loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "#dc2626" }}
          >
            {state.loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
