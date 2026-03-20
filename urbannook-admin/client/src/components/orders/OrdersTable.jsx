import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import OrderRow from "./OrderRow";

const COLUMNS = [
  { label: "Order ID", field: null },
  { label: "Customer", field: null },
  { label: "Name", field: null },
  { label: "Items", field: null },
  { label: "Total", field: "amount" },
  { label: "Status", field: null },
  { label: "Date", field: "createdAt" },
  { label: "Actions", field: null },
];

/**
 * Sortable column header button.
 * Shows a directional arrow when this column is the active sort field.
 */
function SortableHeader({ label, field, activeSort, onSort }) {
  if (!field) {
    return (
      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
        {label}
      </th>
    );
  }

  const isActive = activeSort.sortBy === field;
  const isAsc = isActive && activeSort.sortOrder === "asc";

  const handleClick = () => {
    if (isActive) {
      // Toggle direction on the same column
      onSort({ sortBy: field, sortOrder: isAsc ? "desc" : "asc" });
    } else {
      // New column — default to descending
      onSort({ sortBy: field, sortOrder: "desc" });
    }
  };

  return (
    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 hover:text-gray-900 transition-colors focus:outline-none focus-visible:underline"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive ? (
          isAsc ? (
            <ArrowUp className="h-3 w-3 text-gray-900" />
          ) : (
            <ArrowDown className="h-3 w-3 text-gray-900" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-gray-300" />
        )}
      </button>
    </th>
  );
}

/**
 * The orders table shell.
 * Renders sortable column headers and delegates each row to OrderRow.
 */
export default function OrdersTable({ orders, sort, selectedOrder, onSort, onSelectOrder }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="grid">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {COLUMNS.map((col) => (
              <SortableHeader
                key={col.label}
                label={col.label}
                field={col.field}
                activeSort={sort}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => (
            <OrderRow
              key={order.orderId ?? order._id}
              order={order}
              isSelected={selectedOrder?._id === order._id}
              onSelect={onSelectOrder}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
