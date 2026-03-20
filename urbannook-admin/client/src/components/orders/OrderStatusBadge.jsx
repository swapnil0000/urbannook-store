/**
 * Reusable order status badge.
 * Strictly uses green/yellow/red — no blue or slate tones.
 */

const STATUS_CLASSES = {
  PAID: "bg-green-100 text-green-800",
  CREATED: "bg-yellow-100 text-yellow-800",
  FAILED: "bg-red-100 text-red-800",
};

export function getStatusClasses(status) {
  return STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-700";
}

export default function OrderStatusBadge({ status }) {
  if (!status) return null;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(status)}`}
    >
      {status}
    </span>
  );
}
