import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import ShipmentStatusBadge from "./ShipmentStatusBadge";

export default function AssignCourierDrawer({ state, onFetchRates, onConfirm, onClose }) {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef(null);
  const rafRef        = useRef(null);

  // Local overlay state
  const [rates,              setRates]              = useState([]);
  const [loadingRates,       setLoadingRates]       = useState(false);
  const [ratesError,         setRatesError]         = useState(null);
  const [selectedCourierId,  setSelectedCourierId]  = useState(null);
  const [assigning,          setAssigning]          = useState(false);
  const [assignError,        setAssignError]        = useState(null);

  // Animate in
  useEffect(() => {
    if (state.open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [state.open]);

  // Reset and fetch rates when opened with a shipment
  useEffect(() => {
    if (!state.open || !state.shipment) return;
    setRates([]);
    setRatesError(null);
    setSelectedCourierId(null);
    setAssigning(false);
    setAssignError(null);

    setLoadingRates(true);
    onFetchRates(state.shipment._id)
      .then((data) => {
        // Shipmozo rate response varies — try common shapes
        const rateList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setRates(rateList);
        if (rateList.length === 0) setRatesError("No courier options available for this pincode/weight combination.");
      })
      .catch((err) => {
        setRatesError(err.response?.data?.message || err.message || "Failed to fetch courier rates.");
      })
      .finally(() => setLoadingRates(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.shipment?._id]);

  // Escape key
  useEffect(() => {
    if (!state.open) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open]);

  // Cleanup
  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimerRef.current = setTimeout(onClose, 300);
  }, [onClose]);

  const handleAssign = async () => {
    if (!selectedCourierId || !state.shipment) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await onConfirm(state.shipment._id, selectedCourierId);
      // onConfirm closes the drawer via the hook
    } catch (err) {
      setAssignError(err.response?.data?.message || err.message || "Failed to assign courier.");
      setAssigning(false);
    }
  };

  if (!state.open) return null;

  // Helper: extract field from rate object defensively
  const rateField = (rate, ...keys) => {
    for (const k of keys) {
      if (rate[k] !== undefined && rate[k] !== null) return rate[k];
    }
    return "—";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[580px] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--color-urban-surface)", borderLeft: "1px solid var(--color-urban-border)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Assign courier"
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5 shrink-0"
          style={{ background: "var(--color-urban-raised)", borderBottom: "1px solid var(--color-urban-border)" }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-urban-text)" }}>Assign Courier</h2>
            {state.shipment && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs font-mono" style={{ color: "var(--color-urban-text-muted)" }}>{state.shipment.sourceOrderId}</p>
                <ShipmentStatusBadge status={state.shipment.shipmentStatus} />
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors ml-4 shrink-0"
            style={{ color: "var(--color-urban-text-muted)" }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingRates ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
              <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>Fetching available courier rates…</p>
            </div>
          ) : ratesError ? (
            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}
            >
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{ratesError}</p>
            </div>
          ) : (
            <>
              <p className="text-xs mb-4" style={{ color: "var(--color-urban-text-muted)" }}>
                Select a courier to assign to this shipment. Rates are inclusive of all charges.
              </p>

              {/* Rates table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--color-urban-border)" }}
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: "color-mix(in srgb, var(--color-urban-raised) 80%, transparent)" }}>
                      {["Courier", "Service", "Price (₹)", "ETA", "Select"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest"
                          style={{ color: "var(--color-urban-text-muted)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate, idx) => {
                      const courierId = rate.courier_id ?? rate.id ?? idx;
                      const isSelected = String(selectedCourierId) === String(courierId);
                      return (
                        <tr
                          key={courierId}
                          onClick={() => setSelectedCourierId(courierId)}
                          className="cursor-pointer transition-colors"
                          style={{
                            borderTop: "1px solid var(--color-urban-border)",
                            background: isSelected ? "color-mix(in srgb, var(--color-urban-neon) 8%, transparent)" : "transparent",
                          }}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold" style={{ color: "var(--color-urban-text)" }}>
                              {rateField(rate, "courier_name", "courier", "name")}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs" style={{ color: "var(--color-urban-text-sec)" }}>
                              {rateField(rate, "service_name", "service", "courier_company_service")}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold" style={{ color: "var(--color-urban-neon)" }}>
                              ₹{rateField(rate, "total_charges", "rate", "charge", "price")}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs" style={{ color: "var(--color-urban-text-sec)" }}>
                              {rateField(rate, "tat", "estimated_days", "eta")}
                              {rate.tat || rate.estimated_days ? " days" : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {isSelected && <CheckCircle className="h-4 w-4" style={{ color: "var(--color-urban-neon)" }} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {assignError && (
                <div
                  className="flex items-start gap-3 p-3 rounded-xl mt-4"
                  style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}
                >
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{assignError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loadingRates && !ratesError && (
          <div
            className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
            style={{ borderTop: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}
          >
            <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>
              {selectedCourierId ? "1 courier selected" : "Select a courier above"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  border: "1px solid var(--color-urban-border)",
                  color: "var(--color-urban-text-sec)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedCourierId || assigning}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ background: "var(--gradient-urban-accent)" }}
              >
                {assigning && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign Courier
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
