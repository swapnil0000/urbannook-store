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
        className="relative rounded-xl border shadow-2xl w-full max-w-md flex flex-col"
        style={{ backgroundColor: "#1A1A1A", borderColor: "#2A2A2A" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b rounded-t-xl"
          style={{ borderColor: "#2A2A2A", backgroundColor: "#111111" }}
        >
          <div>
            <h2 className="text-sm font-semibold text-white">Shipping Label</h2>
            {awb !== "label" && (
              <p className="text-xs font-mono text-gray-500 mt-0.5">AWB: {awb}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500">Fetching shipping label…</p>
            </div>
          ) : state.error ? (
            <div className="space-y-3">
              <div
                className="flex items-start gap-3 p-4 rounded-xl border"
                style={{ backgroundColor: "#2A1515", borderColor: "#4A2020" }}
              >
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{state.error}</p>
              </div>
              {onRetry && (
                <button
                  onClick={() => onRetry(state.shipment)}
                  className="w-full py-2 rounded-lg text-sm text-gray-400 border transition-colors hover:text-white"
                  style={{ borderColor: "#333" }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : state.label ? (
            /* Label image — tagged for print isolation */
            <div data-print-target="">
              <img
                src={state.label}
                alt="Shipping label"
                className="w-full rounded-lg border"
                style={{ borderColor: "#2A2A2A" }}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Label data is empty.</p>
          )}
        </div>

        {/* Footer actions */}
        {state.label && !state.loading && (
          <div
            className="flex items-center gap-2 px-5 pb-5"
          >
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors text-gray-300 hover:text-white"
              style={{ borderColor: "#333" }}
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: "white", color: "black" }}
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
