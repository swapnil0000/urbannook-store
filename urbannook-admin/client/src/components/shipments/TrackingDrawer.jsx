import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, AlertCircle, MapPin } from "lucide-react";
import ShipmentStatusBadge from "./ShipmentStatusBadge";

function formatScanDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return isNaN(d.getTime())
    ? dt
    : d.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
}

export default function TrackingDrawer({ state, onClose }) {
  const [visible, setVisible]   = useState(false);
  const closeTimerRef           = useRef(null);
  const rafRef                  = useRef(null);

  // Animate in
  useEffect(() => {
    if (state.open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [state.open]);

  useEffect(() => {
    if (!state.open) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open]);

  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimerRef.current = setTimeout(onClose, 300);
  }, [onClose]);

  if (!state.open) return null;

  const td = state.trackData;
  const scans = Array.isArray(td?.scan_detail) ? [...td.scan_detail].reverse() : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-l ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "#1A1A1A", borderColor: "#2A2A2A" }}
        role="dialog"
        aria-modal="true"
        aria-label="Track package"
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5 border-b shrink-0"
          style={{ backgroundColor: "#111111", borderColor: "#2A2A2A" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <h2 className="text-base font-semibold text-white">Track Package</h2>
            </div>
            {state.shipment?.awbNumber && (
              <p className="text-xs font-mono text-gray-500 mt-1">{state.shipment.awbNumber}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/10 transition-colors ml-4 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500">Fetching tracking data…</p>
            </div>
          ) : state.error ? (
            <div
              className="flex items-start gap-3 p-4 rounded-xl border"
              style={{ backgroundColor: "#2A1515", borderColor: "#4A2020" }}
            >
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{state.error}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status summary */}
              {td && (
                <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: "#2A2A2A", backgroundColor: "#111111" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Current Status</p>
                    <ShipmentStatusBadge status={state.shipment?.shipmentStatus} />
                  </div>
                  {td.current_status && (
                    <p className="text-sm text-gray-300">{td.current_status}</p>
                  )}
                  {td.courier && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Courier</p>
                      <p className="text-xs text-gray-300">{td.courier}</p>
                    </div>
                  )}
                  {td.expected_delivery_date && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Expected Delivery</p>
                      <p className="text-xs text-gray-300">{formatScanDate(td.expected_delivery_date)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Tracking History
                </p>

                {scans.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No scan events recorded yet.</p>
                ) : (
                  <div className="relative">
                    {/* Vertical connector */}
                    <div
                      className="absolute left-[7px] top-2 bottom-2 w-px"
                      style={{ backgroundColor: "#2A2A2A" }}
                    />

                    <div className="space-y-5">
                      {scans.map((scan, idx) => (
                        <div key={idx} className="flex gap-4 relative">
                          {/* Timeline dot */}
                          <div
                            className={`h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 z-10 ${
                              idx === 0
                                ? "border-green-500 bg-green-500"
                                : "border-[#333] bg-[#1A1A1A]"
                            }`}
                            style={{ minWidth: "1rem" }}
                          />
                          <div className="pb-1">
                            <p className="text-sm font-medium text-gray-200">
                              {scan.scan_status ?? scan.scanStatus ?? "—"}
                            </p>
                            {(scan.scan_location ?? scan.scanLocation) && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {scan.scan_location ?? scan.scanLocation}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 mt-0.5">
                              {formatScanDate(scan.scan_date_time ?? scan.scanDateTime)}
                            </p>
                            {(scan.remarks ?? scan.remark) && (
                              <p className="text-xs text-gray-600 italic mt-0.5">
                                {scan.remarks ?? scan.remark}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
