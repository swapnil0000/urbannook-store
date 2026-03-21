import { Link } from "react-router-dom";
import { Package, Truck, Users, ShoppingCart, ArrowRight } from "lucide-react";
import SectionCard from "./SectionCard";

const actions = [
  { to: "/admin/products",  icon: Package,      label: "Add Product"       },
  { to: "/admin/shipments", icon: Truck,         label: "Process Shipments" },
  { to: "/admin/waitlist",  icon: Users,         label: "View Waitlist"     },
  { to: "/admin/orders",    icon: ShoppingCart,  label: "View Orders"       },
];

export default function QuickActions() {
  return (
    <SectionCard title="Quick Actions">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="group relative overflow-hidden flex items-center justify-between
                       px-4 py-3.5 rounded-xl text-sm font-semibold transition-all
                       text-urban-text-sec border border-urban-border
                       hover:text-white hover:border-transparent
                       hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* gradient overlay — same pattern as KpiCard */}
            <span className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100
                             transition-opacity duration-300 pointer-events-none
                             bg-linear-to-br from-urban-accent-from to-urban-accent-to" />
            <span className="relative z-10 flex items-center gap-2.5">
              <Icon size={16} />
              {label}
            </span>
            <ArrowRight size={15} className="relative z-10" />
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
