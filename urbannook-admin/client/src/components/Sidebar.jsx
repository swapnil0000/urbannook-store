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
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useEnv } from "../context/EnvContext";
import { useTheme } from "../context/ThemeContext";
import apiClient from "../api/axios";

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

  const [pwdOpen, setPwdOpen]       = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [showCur, setShowCur]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError]     = useState("");

  const openPwd = () => { setCurrentPwd(""); setNewPwd(""); setPwdError(""); setShowCur(false); setShowNew(false); setPwdOpen(true); };
  const closePwd = () => setPwdOpen(false);

  const handlePasswordChange = async () => {
    if (!currentPwd) { setPwdError("Current password is required"); return; }
    if (newPwd.length < 6) { setPwdError("New password must be at least 6 characters"); return; }
    if (currentPwd === newPwd) { setPwdError("New password must be different from current password"); return; }
    setPwdLoading(true); setPwdError("");
    try {
      await apiClient.patch(`/admin/admins/me/password`, { currentPassword: currentPwd, password: newPwd });
      closePwd();
    } catch (err) {
      setPwdError(err.response?.data?.message || "Failed to update password");
    } finally { setPwdLoading(false); }
  };

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
            onClick={openPwd}
            className="p-1.5 rounded-lg text-urban-text-sec hover:bg-urban-neon/5 hover:text-urban-neon transition-all"
            title="Change password"
          >
            <KeyRound size={15} />
          </button>
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

      {/* ── Change Password Modal — portal so it escapes sidebar bounds ── */}
      {pwdOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-urban-card rounded-xl shadow-xl border border-urban-border w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-urban-neon" />
              <h2 className="text-base font-semibold text-urban-text">Change Password</h2>
            </div>
            <p className="text-xs text-urban-text-muted">{user?.email}</p>

            {/* Current password */}
            <div className="relative">
              <input
                type={showCur ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => { setCurrentPwd(e.target.value); setPwdError(""); }}
                placeholder="Current password"
                autoComplete="current-password"
                className="w-full border border-urban-border rounded-lg px-3 py-2 pr-10 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <button type="button" onClick={() => setShowCur((v) => !v)} className="absolute right-2.5 top-2.5 text-urban-text-muted hover:text-urban-text">
                {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* New password */}
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => { setNewPwd(e.target.value); setPwdError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordChange()}
                placeholder="New password (min 6 chars)"
                autoComplete="new-password"
                className="w-full border border-urban-border rounded-lg px-3 py-2 pr-10 text-sm bg-urban-sidebar text-urban-text placeholder:text-urban-text-muted focus:outline-none focus:ring-2 focus:ring-urban-neon"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-2.5 top-2.5 text-urban-text-muted hover:text-urban-text">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}

            <div className="flex gap-2 justify-end">
              <button onClick={closePwd} className="px-4 py-2 text-sm text-urban-text-sec border border-urban-border rounded-lg hover:bg-urban-neon/5">Cancel</button>
              <button onClick={handlePasswordChange} disabled={pwdLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-urban-neon text-black font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                {pwdLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Update
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
