import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Ticket,
  Truck,
  LogOut,
  FlaskConical,
  ShoppingBag,
  Sun,
  Moon,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEnv } from "../context/EnvContext";
import { useTheme } from "../context/ThemeContext";

const navLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/shipments", label: "Shipments", icon: Truck },
  { to: "/admin/abandoned-carts", label: "Abandoned Carts", icon: ShoppingBag },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/waitlist", label: "Waitlist", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: TrendingUp },
];

export default function Sidebar({ onNavigate }) {
  const { logout } = useAuth();
  const { env, switching, switchEnv } = useEnv();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    if (onNavigate) onNavigate();
    await logout();
  };

  return (
    <div className="flex flex-col h-full w-52 overflow-hidden bg-urban-sidebar border-r border-urban-border">
      {/* ── Branding ──── */}
      <div className="flex items-center gap-3 px-5 h-14 shrink-0 border-b border-urban-border">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-urban-neon/15 shrink-0">
          <span className="text-xs font-black tracking-tight text-urban-neon">
            UN
          </span>
        </span>
        <span className="font-bold text-sm text-urban-text whitespace-nowrap">
          UrbanNook Admin
        </span>
      </div>

      {/* ── Navigation Links ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-urban-neon/10 text-urban-neon border-l-[3px] border-urban-neon pl-[calc(0.75rem-3px)]"
                  : "text-urban-text-sec hover:bg-urban-neon/5 hover:text-urban-text border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]"
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Env Switcher  */}
      <div className="px-3 pb-2 border-t border-urban-border pt-2">
        <p className="text-xs px-1 mb-1.5 flex items-center gap-1 whitespace-nowrap text-urban-text-muted">
          <FlaskConical size={11} />
          Data Source
        </p>
        <div className="flex rounded-lg overflow-hidden text-xs font-medium border border-urban-border">
          <button
            onClick={() => switchEnv("dev")}
            disabled={switching || env === null}
            className={`flex-1 py-1.5 transition-all duration-200 disabled:opacity-50 cursor-pointer ${
              env === "dev"
                ? "bg-amber-500 text-white"
                : "text-urban-text-sec hover:bg-urban-neon/5"
            }`}
          >
            DEV
          </button>
          <button
            onClick={() => switchEnv("prod")}
            disabled={switching || env === null}
            className={`flex-1 py-1.5 transition-all duration-200 disabled:opacity-50 cursor-pointer ${
              env === "prod"
                ? "bg-green-600 text-white"
                : "text-urban-text-sec hover:bg-urban-neon/5"
            }`}
          >
            PROD
          </button>
        </div>
        {switching && (
          <p className="text-xs mt-1 px-1 whitespace-nowrap text-urban-text-muted">
            Switching...
          </p>
        )}
      </div>

      {/* ── Logout ────── */}
      <div className=" flex flex-row items-center gap-10 justify-evenly px-3 py-2 border-t border-urban-border">
        <button
          onClick={toggleTheme}
          className="flex items-center text-sm font-medium transition-all duration-200 text-urban-text-sec hover:bg-urban-neon/5 hover:text-urban-neon cursor-pointer"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun size={17} className="shrink-0 text-amber-400" />
          ) : (
            <Moon size={17} className="shrink-0" />
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all duration-200 text-urban-text-sec hover:bg-red-500/10 hover:text-red-500 cursor-pointer border-l-[3px] border-transparent"
        >
          <span className="whitespace-nowrap">Logout</span>
          <LogOut size={17} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}
