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
  MessageSquare,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEnv } from "../context/EnvContext";
import { useTheme } from "../context/ThemeContext";

const navLinks = [
  { to: "/admin/dashboard",      label: "Dashboard",       icon: LayoutDashboard, resource: null },
  { to: "/admin/products",       label: "Products",        icon: Package,         resource: "products" },
  { to: "/admin/orders",         label: "Orders",          icon: ShoppingCart,    resource: "orders" },
  { to: "/admin/shipments",      label: "Shipments",       icon: Truck,           resource: "shipments" },
  { to: "/admin/abandoned-carts",label: "Abandoned Carts", icon: ShoppingBag,     resource: "abandoned_carts" },
  { to: "/admin/coupons",        label: "Coupons",         icon: Ticket,          resource: "coupons" },
  { to: "/admin/waitlist",       label: "Waitlist",        icon: Users,           resource: "waitlist" },
  { to: "/admin/analytics",      label: "Analytics",       icon: TrendingUp,      resource: null },
  { to: "/admin/testimonials",   label: "Testimonials",    icon: MessageSquare,   resource: "testimonials" },
  { to: "/admin/admins",         label: "Admin Management", icon: Shield,          resource: "users", superAdminOnly: true },
];

export default function Sidebar({ onNavigate }) {
  const { logout, can, permString, user } = useAuth();
  const { env, switching, switchEnv } = useEnv();
  const { isDark, toggleTheme } = useTheme();


  const visibleLinks = navLinks.filter(
    ({ resource, superAdminOnly }) => {
      if (superAdminOnly && user?.role !== "super_admin") return false;
      return !resource || can(resource, "read");
    }
  );

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
        {visibleLinks.map(({ to, label, icon: Icon, resource }) => (
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
            <span className="whitespace-nowrap flex-1">{label}</span>
            {resource && (
              <span className="text-[10px] font-mono text-urban-text-muted opacity-60">
                {permString(resource)}
              </span>
            )}
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

      {/* ── User info + Logout ────── */}
      <div className="px-3 py-2 border-t border-urban-border space-y-1">
        {/* Current user role badge */}
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-urban-text-muted truncate">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${
              user?.role === "super_admin"
                ? "bg-purple-500/15 text-purple-400"
                : "bg-blue-500/15 text-blue-400"
            }`}>
              <Shield size={9} />
              {user?.role ?? "admin"}
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-urban-text-sec hover:bg-urban-neon/5 hover:text-urban-neon transition-all"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm font-medium transition-all duration-200 text-urban-text-sec hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
        >
          <LogOut size={15} className="shrink-0" />
          <span className="whitespace-nowrap">Logout</span>
        </button>
      </div>
    </div>
  );
}
