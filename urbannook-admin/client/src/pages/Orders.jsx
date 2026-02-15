import { useEffect, useState, useCallback } from "react";
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

/**
 * Returns Tailwind CSS classes for an order payment status badge.
 * Exported for reuse and property-based testing.
 *
 * @param {string} status - One of "PAID", "CREATED", "FAILED"
 * @returns {string} Tailwind CSS class string for the badge
 */
export function getOrderStatusBadgeClasses(status) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800";
    case "CREATED":
      return "bg-yellow-100 text-yellow-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function Orders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/orders");
      setOrders(res.data.data || []);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to fetch orders";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">Something went wrong</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="h-6 w-6 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Customer orders will appear here.
          </p>
        </div>
      ) : (
        /* Orders table */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Order ID
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Items
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Total
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Payment Status
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const isExpanded = expandedOrderId === order.orderId;
                  const itemCount = order.items?.length || 0;

                  return (
                    <OrderRow
                      key={order.orderId || order._id}
                      order={order}
                      isExpanded={isExpanded}
                      itemCount={itemCount}
                      onToggle={() => toggleExpand(order.orderId)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A single order row with expand/collapse support.
 */
function OrderRow({ order, isExpanded, itemCount, onToggle }) {
  return (
    <>
      {/* Summary row */}
      <tr
        onClick={onToggle}
        className="hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <td className="px-6 py-4 text-sm font-medium text-gray-900">
          {order.orderId}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">{order.userId}</td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </td>
        <td className="px-6 py-4 text-sm font-medium text-gray-900">
          ${(order.amount ?? 0).toFixed(2)}
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusBadgeClasses(order.status)}`}
          >
            {order.status}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {new Date(order.createdAt).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 text-right">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400 inline-block" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 inline-block" />
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-6 py-4">
            {/* Order items */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items?.map((item, idx) => (
                  <div
                    key={item.productId || idx}
                    className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-3"
                  >
                    <img
                      src={item.productSnapshot?.productImg}
                      alt={item.productSnapshot?.productName}
                      className="h-12 w-12 rounded-md object-cover bg-gray-100 shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.productSnapshot?.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.productSnapshot?.quantity} &middot; $
                        {(item.productSnapshot?.priceAtPurchase ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address */}
            {order.deliveryAddress?.formattedAddress && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  Delivery Address
                </h3>
                <p className="text-sm text-gray-600">
                  {order.deliveryAddress.formattedAddress}
                </p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
