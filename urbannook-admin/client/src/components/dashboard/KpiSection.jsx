import { ShoppingCart, IndianRupee, Users, Globe, Instagram } from "lucide-react";
import KpiCard from "./KpiCard";
import { fmt } from "./dashboardHelpers";

export default function KpiSection({ kpi, loading }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <KpiCard
        title="Total Orders"
        icon={ShoppingCart}
        loading={loading}
        value={fmt(kpi?.totalOrders)}
        trend={kpi?.ordersTrend ?? null}
        badge={kpi?.delivered ? `${fmt(kpi.delivered)} delivered` : null}
        badgeColor={{ background: "#dcfce7", color: "#166534" }}
        channels={[
          { icon: Globe,     label: "Web",       value: fmt(kpi?.webOrders),   trend: kpi?.webOrdersTrend   ?? null },
          { icon: Instagram, label: "Instagram", value: fmt(kpi?.instaOrders), trend: kpi?.instaOrdersTrend ?? null },
        ]}
      />

      <KpiCard
        title="Revenue"
        icon={IndianRupee}
        loading={loading}
        value={`₹${fmt(kpi?.totalRevenue)}`}
        trend={kpi?.revenueTrend ?? null}
        channels={[
          { icon: Globe,     label: "Web",       value: `₹${fmt(kpi?.webRevenue)}`,   trend: kpi?.webRevenueTrend   ?? null },
          { icon: Instagram, label: "Instagram", value: `₹${fmt(kpi?.instaRevenue)}`, trend: kpi?.instaRevenueTrend ?? null },
        ]}
      />

      <KpiCard
        title="Waitlist"
        icon={Users}
        loading={loading}
        value={fmt(kpi?.waitlist)}
        trend={kpi?.waitlistTrend ?? null}
        badge="Members"
        badgeColor={{ background: "color-mix(in srgb, var(--color-urban-neon) 12%, transparent)", color: "var(--color-urban-neon)" }}
      />
    </div>
  );
}
