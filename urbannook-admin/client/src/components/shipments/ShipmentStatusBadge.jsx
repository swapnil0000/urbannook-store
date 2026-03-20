const STATUS_STYLES = {
  PUSHED:            "bg-blue-900/50 text-blue-400 border border-blue-800",
  ASSIGNED:          "bg-indigo-900/50 text-indigo-400 border border-indigo-800",
  PICKUP_SCHEDULED:  "bg-purple-900/50 text-purple-400 border border-purple-800",
  IN_TRANSIT:        "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  OUT_FOR_DELIVERY:  "bg-orange-900/50 text-orange-400 border border-orange-800",
  DELIVERED:         "bg-green-900/50 text-green-400 border border-green-800",
  CANCELLED:         "bg-red-900/50 text-red-400 border border-red-800",
  RTO_INITIATED:     "bg-red-900/50 text-red-400 border border-red-800",
  RTO_DELIVERED:     "bg-gray-800 text-gray-400 border border-gray-700",
  EXCEPTION:         "bg-red-900 text-red-300 border border-red-700",
};

const STATUS_LABELS = {
  PUSHED:            "Pending",
  ASSIGNED:          "Assigned",
  PICKUP_SCHEDULED:  "Pickup Scheduled",
  IN_TRANSIT:        "In Transit",
  OUT_FOR_DELIVERY:  "Out for Delivery",
  DELIVERED:         "Delivered",
  CANCELLED:         "Cancelled",
  RTO_INITIATED:     "RTO Initiated",
  RTO_DELIVERED:     "RTO Delivered",
  EXCEPTION:         "Exception",
};

export default function ShipmentStatusBadge({ status }) {
  const styles = STATUS_STYLES[status] ?? "bg-gray-800 text-gray-400 border border-gray-700";
  const label  = STATUS_LABELS[status] ?? status;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}
