import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X, Loader2 } from "lucide-react";
import Sidebar from "./Sidebar";
import { useEnv } from "../context/EnvContext";

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { switching, env } = useEnv();

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop Sidebar — hidden on mobile, fixed on md+ */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:z-30">
        <Sidebar />
      </aside>

      {/* Mobile Header — visible only below md */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-black">UrbanNook Admin</h1>
        <button
          onClick={openDrawer}
          className="p-2 text-black rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-60 bg-white transform transition-transform duration-200 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end p-2">
          <button
            onClick={closeDrawer}
            className="p-2 text-black rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X size={24} />
          </button>
        </div>
        <Sidebar onNavigate={closeDrawer} />
      </div>

      {/* Main Content */}
      <main className="md:ml-60 pt-14 md:pt-0 min-h-screen">
        <div className="p-6">
          {switching ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">
                Switching to <span className="font-semibold">{env === "dev" ? "PROD" : "DEV"}</span> environment...
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
