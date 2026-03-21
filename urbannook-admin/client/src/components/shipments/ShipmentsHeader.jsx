import { Truck, RefreshCw } from "lucide-react";

export default function ShipmentsHeader({ loading, totalRecords, onRefresh }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-5"
      style={{ borderBottom: "1px solid var(--color-urban-border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, var(--color-urban-neon) 12%, transparent)" }}
        >
          <Truck className="h-4.5 w-4.5" style={{ color: "var(--color-urban-neon)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
            Shipments
          </h1>
          {totalRecords > 0 && (
            <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>
              {totalRecords} total records
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        style={{
          border: "1px solid var(--color-urban-border)",
          color: "var(--color-urban-text-sec)",
          background: "var(--color-urban-raised)",
        }}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
