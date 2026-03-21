import { useReducer, useEffect, useRef, useCallback, useMemo } from "react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

const BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const WEB_SSE_URL = `${BASE}/admin/orders/stream`;
const IG_SSE_URL = `${BASE}/admin/orders/instagram/stream`;

const FETCH_LIMIT = 500;
const PAGE_SIZE = 20;

const initialState = {
  rawWebsite: [],
  rawInstagram: [],
  loadingWebsite: true,
  loadingInstagram: true,
  errorWebsite: null,
  errorInstagram: null,
  filters: { status: "", startDate: "", endDate: "", channel: "all" },
  sort: { sortBy: "createdAt", sortOrder: "desc" },
  currentPage: 1,
  selectedOrder: null,
  pendingNewOrders: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case "WEBSITE_FETCH_START":
      return { ...state, loadingWebsite: true, errorWebsite: null };
    case "WEBSITE_FETCH_SUCCESS":
      return {
        ...state,
        loadingWebsite: false,
        rawWebsite: action.payload.map((o) => ({ ...o, _channel: "website" })),
        pendingNewOrders: 0,
      };
    case "WEBSITE_FETCH_ERROR":
      return { ...state, loadingWebsite: false, errorWebsite: action.payload };

    case "INSTAGRAM_FETCH_START":
      return { ...state, loadingInstagram: true, errorInstagram: null };
    case "INSTAGRAM_FETCH_SUCCESS":
      return {
        ...state,
        loadingInstagram: false,
        rawInstagram: action.payload.map((o) => ({ ...o, _channel: "instagram" })),
        pendingNewOrders: 0,
      };
    case "INSTAGRAM_FETCH_ERROR":
      return { ...state, loadingInstagram: false, errorInstagram: action.payload };

    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload }, currentPage: 1 };
    case "RESET_FILTERS":
      return { ...state, filters: initialState.filters, currentPage: 1 };
    case "SET_SORT":
      return { ...state, sort: action.payload, currentPage: 1 };
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };

    case "NEW_WEBSITE_ORDER": {
      const order = { ...action.payload, _channel: "website" };
      if (state.rawWebsite.some((o) => o._id === order._id || o.orderId === order.orderId))
        return state;
      if (state.filters.status && state.filters.status !== order.status) return state;
      const visible =
        state.currentPage === 1 &&
        state.sort.sortBy === "createdAt" &&
        state.sort.sortOrder === "desc" &&
        state.filters.channel !== "instagram";
      return {
        ...state,
        rawWebsite: [order, ...state.rawWebsite],
        pendingNewOrders: visible ? state.pendingNewOrders : state.pendingNewOrders + 1,
      };
    }
    case "NEW_INSTAGRAM_ORDER": {
      const order = { ...action.payload, _channel: "instagram" };
      if (state.rawInstagram.some((o) => o._id === order._id || o.orderId === order.orderId))
        return state;
      if (state.filters.status && state.filters.status !== order.status) return state;
      const visible =
        state.currentPage === 1 &&
        state.sort.sortBy === "createdAt" &&
        state.sort.sortOrder === "desc" &&
        state.filters.channel !== "website";
      return {
        ...state,
        rawInstagram: [order, ...state.rawInstagram],
        pendingNewOrders: visible ? state.pendingNewOrders : state.pendingNewOrders + 1,
      };
    }

    case "DISMISS_PENDING":
      return { ...state, pendingNewOrders: 0 };
    case "SELECT_ORDER":
      return { ...state, selectedOrder: action.payload };
    case "CLOSE_DRAWER":
      return { ...state, selectedOrder: null };
    default:
      return state;
  }
}

export function useAllOrders({ refreshKey = 0 } = {}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();

  const isMountedRef = useRef(true);
  const webAbortRef = useRef(null);
  const igAbortRef = useRef(null);
  // Keep showToast stable — avoids fetch functions recreating on every render
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // Computed: merge → channel-filter → sort → paginate
  const { displayOrders, totalOrders, totalPages } = useMemo(() => {
    let merged = [...state.rawWebsite, ...state.rawInstagram];
    if (state.filters.channel === "website") {
      merged = merged.filter((o) => o._channel === "website");
    } else if (state.filters.channel === "instagram") {
      merged = merged.filter((o) => o._channel === "instagram");
    }
    const effectiveDateOf = (o) =>
      o._channel === "instagram" ? (o.orderedAt || o.createdAt) : o.createdAt;
    merged.sort((a, b) => {
      let av, bv;
      if (state.sort.sortBy === "amount") {
        av = a.amount ?? 0; bv = b.amount ?? 0;
      } else {
        av = effectiveDateOf(a) ? new Date(effectiveDateOf(a)).getTime() : 0;
        bv = effectiveDateOf(b) ? new Date(effectiveDateOf(b)).getTime() : 0;
      }
      return state.sort.sortOrder === "desc" ? bv - av : av - bv;
    });
    const total = merged.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(state.currentPage, pages);
    const display = merged.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    return { displayOrders: display, totalOrders: total, totalPages: pages };
  }, [state.rawWebsite, state.rawInstagram, state.filters.channel, state.sort, state.currentPage]);

  // Stable fetch functions — empty deps, use refs for toast
  const fetchWebsite = useCallback(async (serverFilters) => {
    if (webAbortRef.current) webAbortRef.current.abort();
    webAbortRef.current = new AbortController();
    dispatch({ type: "WEBSITE_FETCH_START" });
    try {
      const params = { page: 1, limit: FETCH_LIMIT };
      if (serverFilters.status) params.status = serverFilters.status;
      if (serverFilters.startDate) params.startDate = serverFilters.startDate;
      if (serverFilters.endDate) params.endDate = serverFilters.endDate;
      const res = await apiClient.get("/admin/orders", { params, signal: webAbortRef.current.signal });
      if (!isMountedRef.current) return;
      dispatch({ type: "WEBSITE_FETCH_SUCCESS", payload: res.data.data?.orders ?? [] });
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
      const msg = err.response?.data?.message || "Failed to fetch website orders";
      dispatch({ type: "WEBSITE_FETCH_ERROR", payload: msg });
      showToastRef.current(msg, "error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInstagram = useCallback(async (serverFilters) => {
    if (igAbortRef.current) igAbortRef.current.abort();
    igAbortRef.current = new AbortController();
    dispatch({ type: "INSTAGRAM_FETCH_START" });
    try {
      const params = { page: 1, limit: FETCH_LIMIT };
      if (serverFilters.status) params.status = serverFilters.status;
      if (serverFilters.startDate) params.startDate = serverFilters.startDate;
      if (serverFilters.endDate) params.endDate = serverFilters.endDate;
      const res = await apiClient.get("/admin/orders/instagram", { params, signal: igAbortRef.current.signal });
      if (!isMountedRef.current) return;
      dispatch({ type: "INSTAGRAM_FETCH_SUCCESS", payload: res.data.data?.orders ?? [] });
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
      const msg = err.response?.data?.message || "Failed to fetch Instagram orders";
      dispatch({ type: "INSTAGRAM_FETCH_ERROR", payload: msg });
      showToastRef.current(msg, "error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch only when server-side filters change OR env switches (refreshKey)
  // channel filter is client-side only — does NOT trigger a re-fetch
  useEffect(() => {
    const f = {
      status: state.filters.status,
      startDate: state.filters.startDate,
      endDate: state.filters.endDate,
    };
    fetchWebsite(f);
    fetchInstagram(f);
  }, [
    state.filters.status,
    state.filters.startDate,
    state.filters.endDate,
    refreshKey,
    fetchWebsite,
    fetchInstagram,
  ]);

  // SSE — website stream
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(WEB_SSE_URL, { withCredentials: true });
    es.addEventListener("new_order", (e) => {
      if (!isMountedRef.current) return;
      try {
        dispatch({ type: "NEW_WEBSITE_ORDER", payload: JSON.parse(e.data) });
        showToastRef.current("New website order received!", "success");
      } catch { /* ignore */ }
    });
    es.onerror = () => {};
    return () => es.close();
  }, []);

  // SSE — Instagram stream
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(IG_SSE_URL, { withCredentials: true });
    es.addEventListener("new_instagram_order", (e) => {
      if (!isMountedRef.current) return;
      try {
        dispatch({ type: "NEW_INSTAGRAM_ORDER", payload: JSON.parse(e.data) });
        showToastRef.current("New Instagram order received!", "success");
      } catch { /* ignore */ }
    });
    es.onerror = () => {};
    return () => es.close();
  }, []);

  // Mount / unmount lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (webAbortRef.current) webAbortRef.current.abort();
      if (igAbortRef.current) igAbortRef.current.abort();
    };
  }, []);

  const setPage = useCallback((p) => dispatch({ type: "SET_PAGE", payload: p }), []);
  const setFilters = useCallback((f) => dispatch({ type: "SET_FILTERS", payload: f }), []);
  const resetFilters = useCallback(() => dispatch({ type: "RESET_FILTERS" }), []);
  const setSort = useCallback((s) => dispatch({ type: "SET_SORT", payload: s }), []);
  const selectOrder = useCallback((o) => dispatch({ type: "SELECT_ORDER", payload: o }), []);
  const closeDrawer = useCallback(() => dispatch({ type: "CLOSE_DRAWER" }), []);
  const dismissPending = useCallback(() => dispatch({ type: "DISMISS_PENDING" }), []);

  const refetch = useCallback(() => {
    const f = {
      status: state.filters.status,
      startDate: state.filters.startDate,
      endDate: state.filters.endDate,
    };
    fetchWebsite(f);
    fetchInstagram(f);
  }, [state.filters.status, state.filters.startDate, state.filters.endDate, fetchWebsite, fetchInstagram]);

  return {
    orders: displayOrders,
    loading: state.loadingWebsite || state.loadingInstagram,
    error: state.errorWebsite || state.errorInstagram,
    pagination: {
      currentPage: state.currentPage,
      totalPages,
      totalOrders,
      limit: PAGE_SIZE,
    },
    filters: state.filters,
    sort: state.sort,
    selectedOrder: state.selectedOrder,
    pendingNewOrders: state.pendingNewOrders,
    setPage,
    setFilters,
    resetFilters,
    setSort,
    selectOrder,
    closeDrawer,
    dismissPending,
    refetch,
  };
}
