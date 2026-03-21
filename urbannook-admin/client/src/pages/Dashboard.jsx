import { useEffect, useRef, useState, useCallback } from "react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useEnv } from "../context/EnvContext";
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

  // SSE — silent refetch on new order events
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL;
    const webSrc = new EventSource(`${base}/admin/orders/stream`, {
      withCredentials: true,
    });
    const instaSrc = new EventSource(`${base}/admin/orders/instagram/stream`, {
      withCredentials: true,
    });
    const silentRefetch = () => fetchStats(true);
    webSrc.addEventListener("new_order", silentRefetch);
    instaSrc.addEventListener("new_instagram_order", silentRefetch);
    return () => {
      webSrc.close();
      instaSrc.close();
    };
  }, [fetchStats]);

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
