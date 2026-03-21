const TABS = [
  { id: "ALL",       label: "All" },
  { id: "NEW",       label: "New" },
  { id: "ASSIGNED",  label: "Courier Assigned" },
  { id: "TRANSIT",   label: "In Transit" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "RTO",       label: "RTO / Exceptions" },
];

export default function ShipmentsTabs({ activeTab, onTabChange }) {
  return (
    <div
      className="flex overflow-x-auto"
      style={{ borderBottom: "1px solid var(--color-urban-border)" }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px"
            style={
              isActive
                ? { borderColor: "var(--color-urban-neon)", color: "var(--color-urban-neon)" }
                : { borderColor: "transparent", color: "var(--color-urban-text-muted)" }
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
