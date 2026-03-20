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
        className="rounded-xl border shadow-2xl w-full max-w-sm p-6"
        style={{ backgroundColor: "#1A1A1A", borderColor: "#2A2A2A" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "#2A1515" }}
          >
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Cancel Shipment</h3>
            <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
          </div>
        </div>

        {/* Order reference */}
        {state.shipment && (
          <div
            className="rounded-lg px-3 py-2 mb-4 border"
            style={{ backgroundColor: "#111111", borderColor: "#2A2A2A" }}
          >
            <p className="text-xs text-gray-500">Order</p>
            <p className="text-sm font-mono text-gray-300 mt-0.5">{state.shipment.sourceOrderId}</p>
          </div>
        )}

        {/* Inline error */}
        {state.error && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg border mb-4"
            style={{ backgroundColor: "#2A1515", borderColor: "#4A2020" }}
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{state.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={state.loading}
            className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 border transition-colors hover:text-white disabled:opacity-50"
            style={{ borderColor: "#333" }}
          >
            Keep Shipment
          </button>
          <button
            onClick={() => onConfirm(state.shipment._id)}
            disabled={state.loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#dc2626" }}
          >
            {state.loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
