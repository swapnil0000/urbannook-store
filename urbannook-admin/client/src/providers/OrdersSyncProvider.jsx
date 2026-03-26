/**
 * OrdersSyncProvider
 *
 * Mounts ONCE at app level (inside Auth + Env providers).
 * Responsibilities:
 *   1. Fetch all website + instagram orders into Redux on auth + on env switch.
 *   2. Open exactly ONE SSE connection per stream — no per-page duplication.
 *   3. Dispatch new-order events to Redux so every page stays live.
 *   4. Show a toast when a new order arrives.
 */
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  fetchWebsiteOrders,
  fetchInstagramOrders,
  newWebsiteOrder,
  newInstagramOrder,
  resetOrders,
} from "../store/ordersSlice";
import { useAuth } from "../context/AuthContext";
import { useEnv } from "../context/EnvContext";
import { useToast } from "../context/ToastContext";
import { BASE } from "../constant/constant";

const WEB_SSE_URL   = `${BASE}/admin/orders/stream`;
const INSTA_SSE_URL = `${BASE}/admin/orders/instagram/stream`;

export default function OrdersSyncProvider({ children }) {
  const dispatch        = useDispatch();
  const { isAuthenticated } = useAuth();
  const { refreshKey }  = useEnv();
  const { showToast }   = useToast();
  const showToastRef    = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // ── Initial fetch + re-fetch on env switch ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    // Clear stale data from previous env before loading new env's orders
    dispatch(resetOrders());
    dispatch(fetchWebsiteOrders());
    dispatch(fetchInstagramOrders());
  }, [isAuthenticated, refreshKey, dispatch]);

  // ── SSE — website orders stream ───────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || typeof EventSource === "undefined") return;
    const es = new EventSource(WEB_SSE_URL, { withCredentials: true });
    es.addEventListener("new_order", (e) => {
      try {
        dispatch(newWebsiteOrder(JSON.parse(e.data)));
        showToastRef.current("New website order received!", "success");
      } catch { /* ignore parse errors */ }
    });
    es.onerror = () => {};
    return () => es.close();
  }, [isAuthenticated, dispatch]);

  // ── SSE — Instagram orders stream ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || typeof EventSource === "undefined") return;
    const es = new EventSource(INSTA_SSE_URL, { withCredentials: true });
    es.addEventListener("new_instagram_order", (e) => {
      try {
        dispatch(newInstagramOrder(JSON.parse(e.data)));
        showToastRef.current("New Instagram order received!", "success");
      } catch { /* ignore parse errors */ }
    });
    es.onerror = () => {};
    return () => es.close();
  }, [isAuthenticated, dispatch]);

  return children;
}
