import { useReducer, useEffect, useRef, useCallback } from "react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

// Dedicated SSE endpoint for Instagram orders — separate from the website stream
const SSE_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"}/admin/orders/instagram/stream`;

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
  pendingNewOrders: 0,
};

//   Reducer
function reducer(state, action) {
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
        pendingNewOrders: 0,
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

      // Deduplication — guard against duplicate SSE emissions on reconnect
      const alreadyExists = state.orders.some(
        (o) => o.orderId === newOrder.orderId || o._id === newOrder._id,
      );
      if (alreadyExists) return state;

      // Don't inject if it doesn't match the active status filter
      const statusFilterActive = Boolean(state.filters.status);
      const matchesStatusFilter =
        !statusFilterActive || state.filters.status === newOrder.status;
      if (!matchesStatusFilter) return state;

      const newTotal = state.pagination.totalOrders + 1;
      const newTotalPages = Math.max(
        1,
        Math.ceil(newTotal / state.pagination.limit),
      );

      // Only prepend when on page 1 + newest-first sort — otherwise show banner
      const canPrepend =
        state.pagination.currentPage === 1 &&
        state.sort.sortBy === "createdAt" &&
        state.sort.sortOrder === "desc";

      if (canPrepend) {
        return {
          ...state,
          orders: [newOrder, ...state.orders].slice(0, state.pagination.limit),
          pagination: {
            ...state.pagination,
            totalOrders: newTotal,
            totalPages: newTotalPages,
          },
          pendingNewOrders: 0,
        };
      }

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

//   Helper
function buildParams(pagination, filters, sort) {
  const params = {
    page: pagination.currentPage,
    limit: pagination.limit,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
  };
  if (filters.status) params.status = filters.status;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  return params;
}

//   Hook
export function useInstagramOrders() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const eventSourceRef = useRef(null);

  //   Fetch
  const fetchOrders = useCallback(
    async (params) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      dispatch({ type: "FETCH_START" });

      try {
        const res = await apiClient.get("/admin/orders/instagram", {
          params,
          signal: abortControllerRef.current.signal,
        });

        if (!isMountedRef.current) return;

        dispatch({
          type: "FETCH_SUCCESS",
          payload: {
            orders: res.data.data?.orders ?? [],
            pagination: res.data.data?.pagination ?? initialState.pagination,
          },
        });
      } catch (err) {
        if (!isMountedRef.current) return;
        if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;

        const message =
          err.response?.data?.message || "Failed to fetch Instagram orders";
        dispatch({ type: "FETCH_ERROR", payload: message });
        showToast(message, "error");
      }
    },
    [showToast],
  );

  //   Trigger fetch on page / filter / sort changes
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

  //   SSE — real-time new Instagram order notifications
  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const es = new EventSource(SSE_URL, { withCredentials: true });
    eventSourceRef.current = es;

    // Listens for "new_instagram_order" — separate from the website "new_order" event
    es.addEventListener("new_instagram_order", (e) => {
      if (!isMountedRef.current) return;
      try {
        const newOrder = JSON.parse(e.data);
        dispatch({ type: "NEW_ORDER", payload: newOrder });
        showToast("New Instagram order received!", "success");
      } catch {
        // Malformed JSON — ignore silently
      }
    });

    es.onerror = () => {
      // Browser auto-reconnects — no action needed
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [showToast]);

  //   Mount / unmount lifecycle
  // IMPORTANT: isMountedRef.current = true must run on every mount, including
  // React 18 StrictMode's fake remount — otherwise all fetches return early
  // and the page stays in a permanent loading state.
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

  const refetch = useCallback(() => {
    const params = buildParams(state.pagination, state.filters, state.sort);
    fetchOrders(params);
  }, [state.pagination, state.filters, state.sort, fetchOrders]);

  return {
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
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
