import OrderStatusBadge from "./OrderStatusBadge";

/**
 * A single table row. Clicking it opens the detail drawer.
 * Intentionally stateless — all interaction is lifted to the parent via onSelect.
 */
export default function OrderRow({ order, isSelected, onSelect }) {
  const itemCount = order.items?.length ?? 0;

  // Guard: amount may be missing on legacy or malformed records
  const formattedAmount =
    typeof order.amount === "number"
      ? `$${order.amount.toFixed(2)}`
      : "—";

  // Guard: createdAt may be missing or unparseable
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  // Truncate long order IDs with ellipsis for table readability
  const displayOrderId = order.orderId
    ? order.orderId.length > 20
      ? `${order.orderId.slice(0, 10)}…${order.orderId.slice(-6)}`
      : order.orderId
    : order._id ?? "—";

  return (
    <tr
      onClick={() => onSelect(order)}
      className={`cursor-pointer transition-colors ${
        isSelected ? "bg-gray-100" : "hover:bg-gray-50"
      }`}
      aria-selected={isSelected}
    >
      <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">
        <span title={order.orderId}>{displayOrderId}</span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 max-w-[160px] truncate">
        {order.userId || "—"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        {formattedAmount}
      </td>
      <td className="px-6 py-4">
        <OrderStatusBadge status={order.status} />
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">{formattedDate}</td>
    </tr>
  );
}
