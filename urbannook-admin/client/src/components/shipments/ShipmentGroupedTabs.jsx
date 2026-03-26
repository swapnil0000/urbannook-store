// ── Tab group definitions ──────────────────────────────────────────────────
const TAB_GROUPS = [
  {
    id: "booking",
    label: "Shipment Booking",
    tabs: [
      { id: "ALL",            label: "All" },
      { id: "NEW",            label: "New" },
      { id: "ASSIGN_COURIER", label: "Assign Courier" },
    ],
  },
  {
    id: "pickup",
    label: "Pickup Phase",
    tabs: [
      { id: "PICKUP", label: "Pickups & Manifests" },
    ],
  },
  {
    id: "transit",
    label: "Transit & Delivery",
    tabs: [
      { id: "IN_TRANSIT",       label: "In Transit" },
      { id: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
      { id: "DELIVERED",        label: "Delivered" },
    ],
  },
];

// ── Tab ID → count key mapping for badge display ──────────────────────────
const TAB_COUNT_KEYS = {
  ALL:              "ALL",
  NEW:              "NEW",
  ASSIGN_COURIER:   null,
  PICKUP:           "PICKUP",
  IN_TRANSIT:       "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED:        "DELIVERED",
};

export default function ShipmentGroupedTabs({ activeTab, onTabChange, tabCounts = {} }) {
  return (
    <div className="px-4 py-3 flex items-end gap-4 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--color-urban-border)" }}
    >
      {TAB_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-1.5 shrink-0">

          {/* Group label */}
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1 whitespace-nowrap"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
            {group.label}
          </span>

          {/* Segmented pill container */}
          <div
            className="flex overflow-hidden rounded-lg"
            style={{ border: "1px solid var(--color-urban-border)" }}
          >
            {group.tabs.map((tab, tIdx) => {
              const isActive   = activeTab === tab.id;
              const countKey   = TAB_COUNT_KEYS[tab.id];
              const count      = countKey != null ? (tabCounts[countKey] ?? 0) : null;
              const isFirst    = tIdx === 0;
              const isLast     = tIdx === group.tabs.length - 1;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200"
                  style={{
                    borderLeft: !isFirst ? "1px solid var(--color-urban-border)" : undefined,
                    borderRadius: isFirst && isLast ? "0.4rem"
                      : isFirst ? "0.4rem 0 0 0.4rem"
                      : isLast  ? "0 0.4rem 0.4rem 0"
                      : undefined,
                    ...(isActive
                      ? { background: "var(--color-urban-neon)", color: "#0d1a10" }
                      : { background: "var(--color-urban-surface)", color: "var(--color-urban-text-muted)" }
                    ),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--color-urban-raised)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--color-urban-surface)";
                  }}
                >
                  {tab.label}

                  {/* Count badge */}
                  {count != null && count > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-4.25 h-4.25 px-1 rounded-full text-[10px] font-bold leading-none"
                      style={
                        isActive
                          ? { background: "rgba(0,0,0,0.2)", color: "#0d1a10" }
                          : { background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" }
                      }
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      ))}
    </div>
  );
}
