import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Users, ArrowRight, Loader2 } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

export default function Dashboard() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalProducts: null,
    totalOrders: null,
    totalWaitlist: null,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      const results = { totalProducts: null, totalOrders: null, totalWaitlist: null };

      const fetches = [
        {
          key: "totalProducts",
          request: apiClient.get("/admin/total/products"),
          extract: (res) => res.data.data.length,
          label: "products",
        },
        {
          key: "totalOrders",
          request: apiClient.get("/admin/orders"),
          extract: (res) => res.data.data.length,
          label: "orders",
        },
        {
          key: "totalWaitlist",
          request: apiClient.get("/admin/joined/waitlist"),
          extract: (res) => res.data.data.totalJoinedUserWaitList,
          label: "waitlist users",
        },
      ];

      const settled = await Promise.allSettled(fetches.map((f) => f.request));

      settled.forEach((result, index) => {
        const { key, extract, label } = fetches[index];
        if (result.status === "fulfilled") {
          try {
            results[key] = extract(result.value);
          } catch {
            showToast(`Failed to parse ${label} data`, "error");
          }
        } else {
          const message =
            result.reason?.response?.data?.message ||
            `Failed to fetch ${label}`;
          showToast(message, "error");
        }
      });

      setMetrics(results);
      setLoading(false);
    };

    fetchMetrics();
  }, [showToast]);

  const metricCards = [
    {
      title: "Total Products",
      value: metrics.totalProducts,
      icon: Package,
    },
    {
      title: "Total Orders",
      value: metrics.totalOrders,
      icon: ShoppingCart,
    },
    {
      title: "Total Waitlist Users",
      value: metrics.totalWaitlist,
      icon: Users,
    },
  ];

  const quickActions = [
    {
      title: "Manage Products",
      description: "View and manage your product catalog",
      to: "/admin/products",
      icon: Package,
    },
    {
      title: "View Orders",
      description: "Monitor customer orders and fulfillment",
      to: "/admin/orders",
      icon: ShoppingCart,
    },
    {
      title: "View Waitlist",
      description: "Track users who joined the waitlist",
      to: "/admin/waitlist",
      icon: Users,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500">
                  {card.title}
                </h2>
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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

      {/* Quick Action Cards */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Quick Actions
      </h2>
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
                <h3 className="text-base font-semibold text-gray-900">
                  {action.title}
                </h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {action.description}
              </p>
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
