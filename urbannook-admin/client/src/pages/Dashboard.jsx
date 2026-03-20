import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Users, ArrowRight, Loader2, IndianRupee, Clock } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useEnv } from "../context/EnvContext";

export default function Dashboard() {
  const { showToast } = useToast();
  const { refreshKey } = useEnv();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/admin/dashboard/stats");
        setStats(res.data.data);
      } catch (err) {
        showToast(err.response?.data?.message || "Failed to fetch dashboard stats", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [showToast, refreshKey]);

  const metricCards = [
    { title: "Total Revenue", value: stats ? `₹${stats.totalRevenue.toLocaleString("en-IN")}` : null, icon: IndianRupee },
    { title: "Total Orders (Paid)", value: stats?.totalOrders ?? null, icon: ShoppingCart },
    { title: "Pending Orders", value: stats?.pendingOrders ?? null, icon: Clock },
    { title: "Total Products", value: stats?.totalProducts ?? null, icon: Package },
    { title: "Waitlist Users", value: stats?.totalWaitlist ?? null, icon: Users },
  ];

  const quickActions = [
    { title: "Manage Products", description: "View and manage your product catalog", to: "/admin/products", icon: Package },
    { title: "View Orders", description: "Monitor customer orders and fulfillment", to: "/admin/orders", icon: ShoppingCart },
    { title: "View Waitlist", description: "Track users who joined the waitlist", to: "/admin/waitlist", icon: Users },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium text-gray-500">{card.title}</h2>
                <Icon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : card.value !== null ? (
                  card.value
                ) : (
                  "—"
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      {!loading && stats?.recentOrders?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentOrders.map((order) => (
              <div key={order.orderId} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.orderId}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹{(order.amount ?? 0).toLocaleString("en-IN")}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getFulfillmentBadge(order.fulfillmentStatus)}`}>
                    {order.fulfillmentStatus || "PROCESSING"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.to}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-5 w-5 text-gray-700" />
                <h3 className="text-base font-semibold text-gray-900">{action.title}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">{action.description}</p>
              <div className="flex items-center text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                Go to page
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getFulfillmentBadge(status) {
  switch (status) {
    case "SHIPPED": return "bg-blue-100 text-blue-800";
    case "DELIVERED": return "bg-green-100 text-green-800";
    case "CANCELLED": return "bg-red-100 text-red-800";
    default: return "bg-yellow-100 text-yellow-800";
  }
}
