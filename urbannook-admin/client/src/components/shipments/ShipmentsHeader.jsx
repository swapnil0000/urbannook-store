import { Truck, RefreshCw } from "lucide-react";

export default function ShipmentsHeader({ loading, totalRecords, onRefresh }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-5 border-b"
      style={{ borderColor: "#2A2A2A" }}
    >
      <div className="flex items-center gap-3">
        <Truck className="h-5 w-5 text-white" />
        <h1 className="text-lg font-semibold text-white">Shipments</h1>
        {totalRecords > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium text-gray-400"
            style={{ backgroundColor: "#2A2A2A" }}
          >
            {totalRecords}
          </span>
        )}
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 border transition-colors hover:text-white disabled:opacity-50"
        style={{ borderColor: "#333333" }}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
