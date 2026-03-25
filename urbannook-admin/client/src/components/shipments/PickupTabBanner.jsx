import { Info, AlertCircle } from "lucide-react";

/**
 * PickupTabBanner
 *
 * Shown at the top of the Pickup tab.
 * - Lists how many shipments are missing an AWB number.
 * - Guides the admin to use "Sync from Shipmozo" to pull the AWB.
 * - Shows a green confirmation when all have AWBs.
 */
export default function PickupTabBanner({ shipments }) {
  const missingAwb = shipments.filter((s) => !s.awbNumber);

  if (missingAwb.length === 0) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 mx-0 mt-5 rounded-xl text-sm"
        style={{
          background: "color-mix(in srgb, #22c55e 8%, transparent)",
          border: "1px solid color-mix(in srgb, #22c55e 22%, transparent)",
        }}
      >
        <Info className="h-4 w-4 shrink-0 text-green-500" />
        <p style={{ color: "var(--color-urban-text-sec)" }}>
          All shipments in the pickup phase have AWB numbers assigned.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 mx-0 mt-5 rounded-xl"
      style={{
        background: "color-mix(in srgb, #f59e0b 8%, transparent)",
        border: "1px solid color-mix(in srgb, #f59e0b 22%, transparent)",
      }}
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: "var(--color-urban-text)" }}>
          {missingAwb.length} shipment{missingAwb.length !== 1 ? "s" : ""} awaiting AWB
        </p>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-urban-text-sec)" }}>
          AWB not yet received from courier. Open the{" "}
          <span className="font-semibold" style={{ color: "var(--color-urban-text)" }}>
            ⋮ action menu
          </span>{" "}
          on each row and choose{" "}
          <span className="font-semibold" style={{ color: "var(--color-urban-text)" }}>
            Sync from Shipmozo
          </span>{" "}
          to pull the latest AWB number.
        </p>
      </div>
    </div>
  );
}
