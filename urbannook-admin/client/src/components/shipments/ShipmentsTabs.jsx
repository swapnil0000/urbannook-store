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
    <div className="flex border-b overflow-x-auto" style={{ borderColor: "#2A2A2A" }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-white text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
