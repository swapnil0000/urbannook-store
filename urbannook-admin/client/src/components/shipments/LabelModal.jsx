import { useEffect, useRef } from "react";
import { X, Loader2, AlertCircle, Printer, Download } from "lucide-react";

export default function LabelModal({ state, onClose, onRetry }) {
  const printStyleRef = useRef(null);

  // Inject print styles when modal is open (isolates label for printing)
  useEffect(() => {
    if (!state.open) return;
    const style = document.createElement("style");
    style.setAttribute("data-shipment-print", "1");
    style.textContent = `
      @media print {
        body > *:not([data-print-target]) { display: none !important; }
        [data-print-target] { display: block !important; }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;
    return () => {
      if (printStyleRef.current) printStyleRef.current.remove();
    };
  }, [state.open]);

  if (!state.open) return null;

  const awb = state.shipment?.awbNumber ?? "label";

  const handlePrint = () => window.print();

  const handleDownload = () => {
    if (!state.label) return;
    const a  = document.createElement("a");
    a.href   = state.label;
    a.download = `shipping-label-${awb}.png`;
    a.click();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="relative rounded-xl shadow-2xl w-full max-w-md flex flex-col"
        style={{ background: "var(--color-urban-panel)", border: "1px solid var(--color-urban-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 rounded-t-xl"
          style={{ background: "var(--color-urban-raised)", borderBottom: "1px solid var(--color-urban-border)" }}
        >
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--color-urban-text)" }}>Shipping Label</h2>
            {awb !== "label" && (
              <p className="text-xs font-mono mt-0.5" style={{ color: "var(--color-urban-text-muted)" }}>AWB: {awb}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
              <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>Fetching shipping label…</p>
            </div>
          ) : state.error ? (
            <div className="space-y-3">
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}
              >
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
              {onRetry && (
                <button
                  onClick={() => onRetry(state.shipment)}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    border: "1px solid var(--color-urban-border)",
                    color: "var(--color-urban-text-sec)",
                    background: "var(--color-urban-raised)",
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : state.label ? (
            <div data-print-target="">
              <img
                src={state.label}
                alt="Shipping label"
                className="w-full rounded-lg"
                style={{ border: "1px solid var(--color-urban-border)" }}
              />
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-urban-text-muted)" }}>Label data is empty.</p>
          )}
        </div>

        {/* Footer actions */}
        {state.label && !state.loading && (
          <div className="flex items-center gap-2 px-5 pb-5">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                border: "1px solid var(--color-urban-border)",
                color: "var(--color-urban-text-sec)",
                background: "var(--color-urban-raised)",
              }}
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "var(--gradient-urban-accent)" }}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
