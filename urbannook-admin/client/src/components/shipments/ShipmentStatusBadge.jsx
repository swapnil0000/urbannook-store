// Inline styles that work in both light and dark modes
const STATUS_STYLES = {
  PUSHED:           { background: "#dbeafe", color: "#1d4ed8" },
  ASSIGNED:         { background: "#ede9fe", color: "#6d28d9" },
  PICKUP_SCHEDULED: { background: "#f3e8ff", color: "#7e22ce" },
  IN_TRANSIT:       { background: "#fef9c3", color: "#92400e" },
  OUT_FOR_DELIVERY: { background: "#ffedd5", color: "#c2410c" },
  DELIVERED:        { background: "#dcfce7", color: "#15803d" },
  CANCELLED:        { background: "#fee2e2", color: "#b91c1c" },
  RTO_INITIATED:    { background: "#fee2e2", color: "#b91c1c" },
  RTO_DELIVERED:    { background: "#f3f4f6", color: "#6b7280" },
  EXCEPTION:        { background: "#fef2f2", color: "#991b1b" },
};

const STATUS_LABELS = {
  PUSHED:           "Pending",
  ASSIGNED:         "Assigned",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  IN_TRANSIT:       "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED:        "Delivered",
  CANCELLED:        "Cancelled",
  RTO_INITIATED:    "RTO Initiated",
  RTO_DELIVERED:    "RTO Delivered",
  EXCEPTION:        "Exception",
};

export default function ShipmentStatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? { background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" };
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase"
      style={style}
    >
      {label}
    </span>
  );
}
