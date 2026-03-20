import { useReducer, useEffect, useRef, useCallback, useMemo } from "react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

const BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const WEB_SSE_URL = `${BASE}/admin/orders/stream`;
const IG_SSE_URL = `${BASE}/admin/orders/instagram/stream`;

// How many orders to fetch from each source (client-side pagination after merge)
const FETCH_LIMIT = 500;
// Page size for the merged display
const PAGE_SIZE = 20;

//   Initial state
const initialState = {
  rawWebsite: [],
  rawInstagram: [],
  loadingWebsite: true,
  loadingInstagram: true,
  errorWebsite: null,
  errorInstagram: null,
  // channel: "all" | "website" | "instagram" — client-side only
  filters: { status: "", startDate: "", endDate: "", channel: "all" },
  sort: { sortBy: "createdAt", sortOrder: "desc" },
  currentPage: 1,
  selectedOrder: null,
  pendingNewOrders: 0,
};

//   Reducer
function reducer(state, action) {
  switch (action.type) {
    case "WEBSITE_FETCH_START":
      return { ...state, loadingWebsite: true, errorWebsite: null };

    case "WEBSITE_FETCH_SUCCESS":
      return {
        ...state,
        loadingWebsite: false,
        // Tag every record so the merged list can be channel-filtered later
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
        rawInstagram: action.payload.map((o) => ({
          ...o,
          _channel: "instagram",
        })),
        pendingNewOrders: 0,
      };

    case "INSTAGRAM_FETCH_ERROR":
      return {
        ...state,
        loadingInstagram: false,
        errorInstagram: action.payload,
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        currentPage: 1,
      };

    case "RESET_FILTERS":
      return { ...state, filters: initialState.filters, currentPage: 1 };

    case "SET_SORT":
      return { ...state, sort: action.payload, currentPage: 1 };

    case "SET_PAGE":
      return { ...state, currentPage: action.payload };

    case "NEW_WEBSITE_ORDER": {
      const order = { ...action.payload, _channel: "website" };
      // Dedup
      if (
        state.rawWebsite.some(
          (o) => o._id === order._id || o.orderId === order.orderId,
        )
      )
        return state;
      // Status filter compat
      if (state.filters.status && state.filters.status !== order.status)
        return state;
      // If on page 1, newest-first, and channel includes website → it'll appear at top
      const visible =
        state.currentPage === 1 &&
        state.sort.sortBy === "createdAt" &&
        state.sort.sortOrder === "desc" &&
        state.filters.channel !== "instagram";
      return {
        ...state,
        rawWebsite: [order, ...state.rawWebsite],
        pendingNewOrders: visible
          ? state.pendingNewOrders
          : state.pendingNewOrders + 1,
      };
    }

    case "NEW_INSTAGRAM_ORDER": {
      const order = { ...action.payload, _channel: "instagram" };
      // Dedup
      if (
        state.rawInstagram.some(
          (o) => o._id === order._id || o.orderId === order.orderId,
        )
      )
        return state;
      // Status filter compat
      if (state.filters.status && state.filters.status !== order.status)
        return state;
      // If on page 1, newest-first, and channel includes instagram → it'll appear at top
      const visible =
        state.currentPage === 1 &&
        state.sort.sortBy === "createdAt" &&
        state.sort.sortOrder === "desc" &&
        state.filters.channel !== "website";
      return {
        ...state,
        rawInstagram: [order, ...state.rawInstagram],
        pendingNewOrders: visible
          ? state.pendingNewOrders
          : state.pendingNewOrders + 1,
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

//   Hook
export function useAllOrders({ refreshKey = 0 } = {}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();

  const isMountedRef = useRef(true);
  const webAbortRef = useRef(null);
  const igAbortRef = useRef(null);

  //   Computed: merge → channel-filter → sort → paginate
  const { displayOrders, totalOrders, totalPages } = useMemo(() => {
    let merged = [...state.rawWebsite, ...state.rawInstagram];

    // Client-side channel filter
    if (state.filters.channel === "website") {
      merged = merged.filter((o) => o._channel === "website");
    } else if (state.filters.channel === "instagram") {
      merged = merged.filter((o) => o._channel === "instagram");
    }

    // Sort
    merged.sort((a, b) => {
      let av, bv;
      if (state.sort.sortBy === "amount") {
        av = a.amount ?? 0;
        bv = b.amount ?? 0;
      } else {
        av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      return state.sort.sortOrder === "desc" ? bv - av : av - bv;
    });

    const total = merged.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    // Clamp currentPage in case filters reduce total pages
    const safePage = Math.min(state.currentPage, pages);
    const display = merged.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE,
    );

    return { displayOrders: display, totalOrders: total, totalPages: pages };
  }, [
    state.rawWebsite,
    state.rawInstagram,
    state.filters.channel,
    state.sort,
    state.currentPage,
  ]);

  //   Fetch website orders
  const fetchWebsite = useCallback(
    async (serverFilters) => {
      if (webAbortRef.current) webAbortRef.current.abort();
      webAbortRef.current = new AbortController();
      dispatch({ type: "WEBSITE_FETCH_START" });
      try {
        const params = { page: 1, limit: FETCH_LIMIT };
        if (serverFilters.status) params.status = serverFilters.status;
        if (serverFilters.startDate) params.startDate = serverFilters.startDate;
        if (serverFilters.endDate) params.endDate = serverFilters.endDate;
        const res = await apiClient.get("/admin/orders", {
          params,
          signal: webAbortRef.current.signal,
        });
        if (!isMountedRef.current) return;
        dispatch({
          type: "WEBSITE_FETCH_SUCCESS",
          payload: res.data.data?.orders ?? [],
        });
      } catch (err) {
        if (!isMountedRef.current) return;
        if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
        const msg =
          err.response?.data?.message || "Failed to fetch website orders";
        dispatch({ type: "WEBSITE_FETCH_ERROR", payload: msg });
        showToast(msg, "error");
      }
    },
    [showToast],
  );

  //   Fetch Instagram orders
  const fetchInstagram = useCallback(
    async (serverFilters) => {
      if (igAbortRef.current) igAbortRef.current.abort();
      igAbortRef.current = new AbortController();
      dispatch({ type: "INSTAGRAM_FETCH_START" });
      try {
        const params = { page: 1, limit: FETCH_LIMIT };
        if (serverFilters.status) params.status = serverFilters.status;
        if (serverFilters.startDate) params.startDate = serverFilters.startDate;
        if (serverFilters.endDate) params.endDate = serverFilters.endDate;
        const res = await apiClient.get("/admin/orders/instagram", {
          params,
          signal: igAbortRef.current.signal,
        });
        if (!isMountedRef.current) return;
        dispatch({
          type: "INSTAGRAM_FETCH_SUCCESS",
          payload: res.data.data?.orders ?? [],
        });
      } catch (err) {
        if (!isMountedRef.current) return;
        if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
        const msg =
          err.response?.data?.message || "Failed to fetch Instagram orders";
        dispatch({ type: "INSTAGRAM_FETCH_ERROR", payload: msg });
        showToast(msg, "error");
      }
    },
    [showToast],
  );

  //   Re-fetch when server-side filters change OR env switches
  // channel is client-side only — changing it does NOT trigger a re-fetch
  useEffect(() => {
    const f = {
      status: state.filters.status,
      startDate: state.filters.startDate,
      endDate: state.filters.endDate,
    };
    fetchWebsite(f);
    fetchInstagram(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.filters.status,
    state.filters.startDate,
    state.filters.endDate,
    fetchWebsite,
    fetchInstagram,
    refreshKey,
  ]);

  //   SSE — website stream
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(WEB_SSE_URL, { withCredentials: true });
    es.addEventListener("new_order", (e) => {
      if (!isMountedRef.current) return;
      try {
        const order = JSON.parse(e.data);
        dispatch({ type: "NEW_WEBSITE_ORDER", payload: order });
        showToast("New website order received!", "success");
      } catch {
        // Malformed JSON — ignore silently
      }
    });
    es.onerror = () => {};
    return () => es.close();
  }, [showToast]);

  //   SSE — Instagram stream
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(IG_SSE_URL, { withCredentials: true });
    es.addEventListener("new_instagram_order", (e) => {
      if (!isMountedRef.current) return;
      try {
        const order = JSON.parse(e.data);
        dispatch({ type: "NEW_INSTAGRAM_ORDER", payload: order });
        showToast("New Instagram order received!", "success");
      } catch {
        // Malformed JSON — ignore silently
      }
    });
    es.onerror = () => {};
    return () => es.close();
  }, [showToast]);

  //   Mount / unmount lifecycle
  // isMountedRef.current = true MUST be in the effect body (not just initializer)
  // so React 18 StrictMode's fake unmount/remount cycle resets it correctly.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (webAbortRef.current) webAbortRef.current.abort();
      if (igAbortRef.current) igAbortRef.current.abort();
    };
  }, []);

  //   Public actions
  const setPage = useCallback(
    (p) => dispatch({ type: "SET_PAGE", payload: p }),
    [],
  );
  const setFilters = useCallback(
    (f) => dispatch({ type: "SET_FILTERS", payload: f }),
    [],
  );
  const resetFilters = useCallback(
    () => dispatch({ type: "RESET_FILTERS" }),
    [],
  );
  const setSort = useCallback(
    (s) => dispatch({ type: "SET_SORT", payload: s }),
    [],
  );
  const selectOrder = useCallback(
    (o) => dispatch({ type: "SELECT_ORDER", payload: o }),
    [],
  );
  const closeDrawer = useCallback(() => dispatch({ type: "CLOSE_DRAWER" }), []);
  const dismissPending = useCallback(
    () => dispatch({ type: "DISMISS_PENDING" }),
    [],
  );

  const refetch = useCallback(() => {
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
    fetchWebsite,
    fetchInstagram,
  ]);

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
    // Actions
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
