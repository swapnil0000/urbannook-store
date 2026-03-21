import { TrendingUp, TrendingDown, Info } from "lucide-react";
import Skeleton from "./Skeleton";

function TrendTip({ children }) {
  return (
    <span className="relative inline-flex items-center group/tip">
      <Info size={10} className="text-urban-text-muted/50 cursor-help ml-0.5" />
      <span
        className="absolute bottom-full right-0 mb-2 w-56 rounded-xl px-3 py-2
                       text-[9px] leading-relaxed text-urban-text-sec whitespace-normal
                       bg-urban-panel border border-urban-border shadow-xl
                       opacity-0 group-hover/tip:opacity-100 pointer-events-none
                       transition-opacity duration-150 z-30"
      >
        {children}
      </span>
    </span>
  );
}

function ChannelBox({ icon: Icon, label, value, trend, loading }) {
  return (
    <div className="flex-1 min-w-0 rounded-xl bg-urban-raised border border-urban-border px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-urban-neon/60 shrink-0" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-urban-text-muted truncate">
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-5 w-14" />
      ) : (
        <>
          <div className="text-sm font-semibold text-urban-text leading-none">
            {value}
          </div>
          {/* {trend != null && (
            <div className={`text-[9px] font-medium mt-1.5 flex items-center gap-0.5 ${
              trend >= 0 ? "text-emerald-500" : "text-red-400"
            }`}>
              {trend >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
              {trend >= 0 ? "+" : ""}{trend} since midnight
            </div>
          )} */}
        </>
      )}
    </div>
  );
}

export default function KpiCard({
  title,
  icon: Icon,
  loading,
  value,
  trend,
  channels,
  badge,
  badgeColor,
}) {
  return (
    <div className="un-card relative overflow-hidden p-5 flex flex-col gap-4 group/card">
      {/* Inline neon gradient overlay — premium feel on KPI cards */}
      <div
        className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[inherit]"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-urban-neon) 8%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-urban-neon/10 shrink-0">
            {Icon && <Icon size={13} className="text-urban-neon" />}
          </div>
          <span className="text-[14px] font-semibold uppercase tracking-wider text-urban-text-muted">
            {title}
          </span>
        </div>
        {badge && !loading && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
            style={badgeColor}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Main value + trend pill */}
      <div className="flex items-end justify-between gap-2">
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <div className="text-3xl font-bold tracking-tight text-urban-text leading-none">
            {value}
          </div>
        )}
        {/* {trend != null && !loading && (
          <div className="flex items-center gap-1 shrink-0">
            <div
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg ${
                trend.up
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {trend.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trend.up ? "+" : "–"}
              {trend.percent}%
            </div>
            <TrendTip>
              % change: today's paid orders (12 AM → now) vs the same time
              window yesterday. Red = fewer orders today, green = more.
            </TrendTip>
          </div>
        )} */}
      </div>

      {/* Channel breakdown */}
      {channels && channels.length > 0 && (
        <div className="flex gap-2 border-t border-urban-border pt-3">
          {channels.map((ch) => (
            <ChannelBox
              key={ch.label}
              icon={ch.icon}
              label={ch.label}
              value={ch.value}
              trend={ch.trend}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
