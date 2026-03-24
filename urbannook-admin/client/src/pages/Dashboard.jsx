import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useEnv } from "../context/EnvContext";
import { selectNewEventCount } from "../store/ordersSlice";
import KpiSection from "../components/dashboard/KpiSection";
import LatestProducts from "../components/dashboard/LatestProducts";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";

export default function Dashboard() {
  const { showToast } = useToast();
  const { refreshKey } = useEnv();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const mountedRef = useRef(true);

  const fetchStats = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await apiClient.get("/admin/dashboard/stats");
        if (mountedRef.current) setStats(res.data.data);
      } catch (err) {
        if (mountedRef.current)
          showToast(
            err.response?.data?.message || "Failed to fetch dashboard stats",
            "error",
          );
      } finally {
        if (mountedRef.current && !silent) setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats, refreshKey]);

  // When OrdersSyncProvider receives a new SSE order, silently refresh stats.
  // No separate SSE connections needed here — Redux newEventCount acts as the signal.
  const newEventCount = useSelector(selectNewEventCount);
  const prevEventCountRef = useRef(newEventCount);
  useEffect(() => {
    if (newEventCount > prevEventCountRef.current) {
      prevEventCountRef.current = newEventCount;
      fetchStats(true);
    }
  }, [newEventCount, fetchStats]);

  const kpi = stats?.kpi;
  const recentOrders = stats?.recentOrders ?? [];
  const latestProducts = stats?.latestProducts ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-urban-text">
          Dashboard
        </h1>
      </div>

      <KpiSection kpi={kpi} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentActivity recentOrders={recentOrders} loading={loading} />
        </div>
        <LatestProducts latestProducts={latestProducts} loading={loading} />
      </div>

      <QuickActions />
    </div>
  );
}
