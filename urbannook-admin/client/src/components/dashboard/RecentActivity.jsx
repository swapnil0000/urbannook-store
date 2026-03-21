import { Globe, Camera } from "lucide-react";
import Skeleton from "./Skeleton";
import SectionCard from "./SectionCard";
import { fmt, relativeTime, STATUS_STYLE } from "./dashboardHelpers";

export default function RecentActivity({ recentOrders, loading }) {
  return (
    <SectionCard title="Recent Activity" linkTo="/admin/orders" linkLabel="All orders">
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : recentOrders.length === 0 ? (
        <p className="text-sm text-center py-6 text-urban-text-muted">No orders yet</p>
      ) : (
        <div className="divide-y divide-urban-border">
          {recentOrders.slice(0, 5).map((order) => {
            const isInsta = order.channel === "instagram";
            const badge = isInsta
              ? { bg: "#f3e8ff", color: "#7c3aed" }
              : STATUS_STYLE[order.fulfillmentStatus] ?? STATUS_STYLE.PROCESSING;
            return (
              <div
                key={`${order.channel}-${order.orderId}`}
                className="flex items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isInsta
                      ? <Camera size={10} className="text-purple-500 shrink-0" />
                      : <Globe size={10} className="text-urban-neon shrink-0" />
                    }
                    <p className="text-xs font-semibold truncate text-urban-text">
                      {order.orderId}
                    </p>
                  </div>
                  <p className="text-[10px] mt-0.5 text-urban-text-muted">
                    {relativeTime(isInsta ? (order.orderedAt || order.createdAt) : order.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-urban-text">
                    ₹{fmt(order.amount)}
                  </p>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {isInsta ? "INSTAGRAM" : (order.fulfillmentStatus ?? "PROCESSING")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
