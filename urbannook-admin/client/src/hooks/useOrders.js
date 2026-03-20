import { useReducer, useEffect, useRef, useCallback } from "react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

// SSE endpoint — same origin as the REST API, protected by cookie auth
const SSE_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/admin/orders/stream`;

const DEFAULT_LIMIT = 20;

//   Initial state
const initialState = {
  orders: [],
  loading: true,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    limit: DEFAULT_LIMIT,
  },
  filters: { status: "", startDate: "", endDate: "" },
  sort: { sortBy: "createdAt", sortOrder: "desc" },
  selectedOrder: null,
  // Count of new orders that arrived while admin was not on page 1 / default sort
  pendingNewOrders: 0,
};

//   Reducer
function ordersReducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };

    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        error: null,
        orders: action.payload.orders,
        pagination: action.payload.pagination,
        pendingNewOrders: 0, // Reset banner whenever a fresh fetch completes
      };

    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };

    case "SET_PAGE":
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: action.payload },
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        // Always reset to page 1 when filter changes — stale page offsets break pagination
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case "RESET_FILTERS":
      return {
        ...state,
        filters: initialState.filters,
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case "SET_SORT":
      return {
        ...state,
        sort: action.payload,
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case "NEW_ORDER": {
      const newOrder = action.payload;

      //   Deduplication
      // Guard against duplicate socket emissions on reconnect
      const alreadyExists = state.orders.some(
        (o) => o.orderId === newOrder.orderId || o._id === newOrder._id,
      );
      if (alreadyExists) return state;

      //   Filter compatibility check
      // Don't inject an order into the list if it doesn't match the active status filter
      const statusFilterActive = Boolean(state.filters.status);
      const matchesStatusFilter =
        !statusFilterActive || state.filters.status === newOrder.status;
      if (!matchesStatusFilter) return state;

      const newTotal = state.pagination.totalOrders + 1;
      const newTotalPages = Math.max(
        1,
        Math.ceil(newTotal / state.pagination.limit),
      );

      //   Prepend only when the view would show this order on top
      // Conditions: page 1 + sorted by newest-first chronological order
      const canPrepend =
        state.pagination.currentPage === 1 &&
        state.sort.sortBy === "createdAt" &&
        state.sort.sortOrder === "desc";

      if (canPrepend) {
        return {
          ...state,
          // Trim list to page size so visible count stays consistent
          orders: [newOrder, ...state.orders].slice(0, state.pagination.limit),
          pagination: {
            ...state.pagination,
            totalOrders: newTotal,
            totalPages: newTotalPages,
          },
          pendingNewOrders: 0,
        };
      }

      // Admin is on another page or non-default sort — show a banner instead
      return {
        ...state,
        pagination: {
          ...state.pagination,
          totalOrders: newTotal,
          totalPages: newTotalPages,
        },
        pendingNewOrders: state.pendingNewOrders + 1,
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

//   Helper: build query params object
function buildParams(pagination, filters, sort) {
  const params = {
    page: pagination.currentPage,
    limit: pagination.limit,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
  };
  // Omit empty filter values so the URL stays clean
  if (filters.status) params.status = filters.status;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  return params;
}

//   Hook
export function useOrders() {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  const { showToast } = useToast();

  // Refs that persist across renders without triggering re-renders
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const eventSourceRef = useRef(null);

  //   Fetch
  // Params are passed explicitly so this function doesn't close over state,
  // keeping its dependency array minimal and preventing infinite fetch loops.
  const fetchOrders = useCallback(
    async (params) => {
      // Cancel any in-flight request before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      dispatch({ type: "FETCH_START" });

      try {
        const res = await apiClient.get("/admin/orders", {
          params,
          signal: abortControllerRef.current.signal,
        });

        if (!isMountedRef.current) return; // Component unmounted during fetch

        dispatch({
          type: "FETCH_SUCCESS",
          payload: {
            orders: res.data.data?.orders ?? [],
            pagination: res.data.data?.pagination ?? initialState.pagination,
          },
        });
      } catch (err) {
        if (!isMountedRef.current) return;

        // AbortController fires 'CanceledError' in axios — not a real error
        if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;

        const message = err.response?.data?.message || "Failed to fetch orders";
        dispatch({ type: "FETCH_ERROR", payload: message });
        showToast(message, "error");
      }
    },
    [showToast],
  );

  //   Trigger fetch on page / filter / sort changes
  // Using individual primitives as deps (not the objects) prevents false re-fetches
  // caused by object reference changes on unrelated state updates.
  useEffect(() => {
    const params = buildParams(state.pagination, state.filters, state.sort);
    fetchOrders(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.pagination.currentPage,
    state.pagination.limit,
    state.filters.status,
    state.filters.startDate,
    state.filters.endDate,
    state.sort.sortBy,
    state.sort.sortOrder,
    fetchOrders,
  ]);

  //   SSE — real-time new order notifications
  // EventSource uses plain HTTP (no WebSocket upgrade) and sends the auth
  // cookie automatically via withCredentials. The browser handles reconnection
  // natively — no library or manual retry logic required.
  useEffect(() => {
    // EventSource is universally supported in modern browsers.
    // Guard for SSR / test environments where it may be absent.
    if (typeof EventSource === "undefined") return;

    const es = new EventSource(SSE_URL, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("new_order", (e) => {
      if (!isMountedRef.current) return;
      try {
        const newOrder = JSON.parse(e.data);
        dispatch({ type: "NEW_ORDER", payload: newOrder });
        showToast("New order received!", "success");
      } catch {
        // Malformed JSON from server — ignore silently
      }
    });

    es.onerror = () => {
      // The browser will automatically reconnect — no action needed.
      // Logging here would be noisy during normal server restarts.
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [showToast]);

  //   Mount / unmount lifecycle
  // IMPORTANT: the setup body (isMountedRef.current = true) must run on every
  // mount — including React 18 StrictMode's fake remount in development.
  // Without this, StrictMode's fake-unmount cleanup sets the ref to false,
  // the fake-remount never resets it, and every subsequent fetch returns early,
  // leaving the page in a permanent loading state.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  //   Public actions
  const setPage = useCallback((page) => {
    dispatch({ type: "SET_PAGE", payload: page });
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: "SET_FILTERS", payload: filters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: "RESET_FILTERS" });
  }, []);

  const setSort = useCallback((sort) => {
    dispatch({ type: "SET_SORT", payload: sort });
  }, []);

  const selectOrder = useCallback((order) => {
    dispatch({ type: "SELECT_ORDER", payload: order });
  }, []);

  const closeDrawer = useCallback(() => {
    dispatch({ type: "CLOSE_DRAWER" });
  }, []);

  const dismissPending = useCallback(() => {
    dispatch({ type: "DISMISS_PENDING" });
  }, []);

  // Manual refetch — rebuilds params from current state
  const refetch = useCallback(() => {
    const params = buildParams(state.pagination, state.filters, state.sort);
    fetchOrders(params);
  }, [state.pagination, state.filters, state.sort, fetchOrders]);

  return {
    // State
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
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
