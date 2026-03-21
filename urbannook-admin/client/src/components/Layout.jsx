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
    <div className="min-h-screen transition-colors duration-300">
      {/* Desktop Sidebar — fixed, always w-60, always expanded */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:z-30 md:w-52">
        <Sidebar />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 bg-urban-sidebar border-b border-urban-border">
        <h1 className="text-lg font-bold text-urban-text">UrbanNook Admin</h1>
        <button
          onClick={openDrawer}
          className="p-2 rounded-md text-urban-text hover:bg-urban-neon/5 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-52 transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end p-2 bg-urban-sidebar border-b border-urban-border">
          <button
            onClick={closeDrawer}
            className="p-2 rounded-md text-urban-text hover:bg-urban-neon/5 transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X size={24} />
          </button>
        </div>
        <div className="h-[calc(100%-48px)]">
          <Sidebar onNavigate={closeDrawer} />
        </div>
      </div>

      {/* Main Content — ml-52 matches sidebar width */}
      <main className="md:ml-52 pt-14 md:pt-0 min-h-screen">
        <div className="p-6">
          {switching ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-urban-text-muted" />
              <p className="text-sm text-urban-text-sec">
                Switching to{" "}
                <span className="font-semibold text-urban-text">
                  {env === "dev" ? "PROD" : "DEV"}
                </span>{" "}
                environment...
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
