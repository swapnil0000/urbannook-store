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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEnv } from "../context/EnvContext";

const navLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/shipments", label: "Shipments", icon: Truck },
  { to: "/admin/abandoned-carts", label: "Abandoned Carts", icon: ShoppingBag },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/waitlist", label: "Waitlist", icon: Users },
];

export default function Sidebar({ onNavigate }) {
  const { logout } = useAuth();
  const { env, switching, switchEnv } = useEnv();

  const handleLogout = async () => {
    if (onNavigate) onNavigate();
    await logout();
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Branding */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-black">UrbanNook Admin</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-black"
                  : "text-gray-600 hover:bg-gray-50 hover:text-black"
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Env Switcher */}
      <div className="px-3 pb-3 border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-400 mb-2 px-1 flex items-center gap-1">
          <FlaskConical size={12} />
          Data Source
        </p>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            onClick={() => switchEnv("dev")}
            disabled={switching || env === null}
            className={`flex-1 py-1.5 transition-colors disabled:opacity-50 ${
              env === "dev"
                ? "bg-amber-500 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            DEV
          </button>
          <button
            onClick={() => switchEnv("prod")}
            disabled={switching || env === null}
            className={`flex-1 py-1.5 transition-colors disabled:opacity-50 ${
              env === "prod"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            PROD
          </button>
        </div>
        {switching && (
          <p className="text-xs text-gray-400 mt-1.5 px-1">Switching...</p>
        )}
      </div>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-black transition-colors cursor-pointer"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
