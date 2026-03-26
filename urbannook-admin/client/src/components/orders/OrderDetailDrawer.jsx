/**
 * OrderDetailDrawer.jsx
 *
 * Slide-over overlay wrapper around OrderDetailPanel.
 * Animation: rAF-tick to trigger CSS translate transition on mount/unmount.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import OrderDetailPanel from "./OrderDetailPanel";

export default function OrderDetailDrawer({ order, onClose, onOrderUpdated }) {
  const [visible, setVisible]   = useState(false);
  const closeTimerRef           = useRef(null);
  const rafRef                  = useRef(null);

  // Slide in once mounted
  useEffect(() => {
    if (order) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [order]);

  // Animate out, then call onClose after transition
  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimerRef.current = setTimeout(onClose, 300);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!order) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [order, handleClose]);

  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  if (!order) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[520px] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${visible ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "var(--color-urban-panel)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
      >
        <OrderDetailPanel
          order={order}
          onClose={handleClose}
          onOrderUpdated={onOrderUpdated}
          className="h-full rounded-none border-none"
        />
      </aside>
    </>
  );
}
