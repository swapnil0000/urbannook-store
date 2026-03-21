/**
 * Reusable order status badge.
 * Strictly uses green/yellow/red — no blue or slate tones.
 */

const STATUS_STYLES = {
  PAID:    { background: "#dcfce7", color: "#15803d" },
  CREATED: { background: "#fef9c3", color: "#92400e" },
  FAILED:  { background: "#fee2e2", color: "#b91c1c" },
};

export function getStatusStyle(status) {
  return STATUS_STYLES[status] ?? { background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" };
}

export default function OrderStatusBadge({ status }) {
  if (!status) return null;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
      style={getStatusStyle(status)}
    >
      {status}
    </span>
  );
}
