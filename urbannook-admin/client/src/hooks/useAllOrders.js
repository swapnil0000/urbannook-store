import { useReducer, useEffect, useRef, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWebsiteOrders,
  fetchInstagramOrders,
  selectWebsiteOrders,
  selectInstagramOrders,
  selectOrdersLoading,
  selectOrdersError,
  selectNewEventCount,
} from "../store/ordersSlice";

const PAGE_SIZE   = 20;
const SESSION_KEY = "orders_session";

const DEFAULT_FILTERS = { status: "", startDate: "", endDate: "", channel: "all" };
const DEFAULT_SORT    = { sortBy: "createdAt", sortOrder: "desc" };

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}"); }
  catch { return {}; }
}

function getInitialState() {
  const saved = readSession();
  return {
    filters:          saved.filters ?? DEFAULT_FILTERS,
    sort:             saved.sort    ?? DEFAULT_SORT,
    currentPage:      1,
    selectedOrder:    null,
    pendingNewOrders: 0,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload }, currentPage: 1 };
    case "RESET_FILTERS":
      return { ...state, filters: DEFAULT_FILTERS, currentPage: 1 };
    case "SET_SORT":
      return { ...state, sort: action.payload, currentPage: 1 };
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };
    case "INCREMENT_PENDING":
      return { ...state, pendingNewOrders: state.pendingNewOrders + action.payload };
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

export function useAllOrders({
  refreshKey = 0,
  searchQuery = "",
  shipmentFilter = "all",
  shippedOrderIds = null,
  dispatchFilter = "all",
  dispatchedOrderIds = null,
} = {}) {
  const reduxDispatch = useDispatch();
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  // ── Raw data from Redux store ─────────────────────────────────────────────
  const rawWebsite   = useSelector(selectWebsiteOrders);
  const rawInstagram = useSelector(selectInstagramOrders);
  const loading      = useSelector(selectOrdersLoading);
  const error        = useSelector(selectOrdersError);
  const newEventCount = useSelector(selectNewEventCount);

  // Persist UI filters + sort to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ filters: state.filters, sort: state.sort })); }
    catch {}
  }, [state.filters, state.sort]);

  // ── Pending-new-orders notification ──────────────────────────────────────
  // When SSE delivers a new order (newEventCount bumps), show the banner
  // only if the new order wouldn't already be visible at the top of the list.
  const seenEventCountRef = useRef(newEventCount);
  useEffect(() => {
    const diff = newEventCount - seenEventCountRef.current;
    if (diff <= 0) return;
    seenEventCountRef.current = newEventCount;
    const onDefaultView =
      state.currentPage === 1 &&
      state.sort.sortBy === "createdAt" &&
      state.sort.sortOrder === "desc";
    if (!onDefaultView) {
      dispatch({ type: "INCREMENT_PENDING", payload: diff });
    }
  }, [newEventCount, state.currentPage, state.sort]);

  // ── Computed: merge → filter → sort → paginate ────────────────────────────
  const { displayOrders, totalOrders, totalPages } = useMemo(() => {
    let merged = [...rawWebsite, ...rawInstagram];

    // Channel filter
    if (state.filters.channel === "website") {
      merged = merged.filter((o) => o._channel === "website");
    } else if (state.filters.channel === "instagram") {
      merged = merged.filter((o) => o._channel === "instagram");
    }

    // Status filter (client-side — Redux holds all statuses)
    if (state.filters.status) {
      merged = merged.filter((o) => o.status === state.filters.status);
    }

    // Date range filter
    if (state.filters.startDate || state.filters.endDate) {
      const start = state.filters.startDate ? new Date(state.filters.startDate) : null;
      const end   = state.filters.endDate   ? new Date(state.filters.endDate)   : null;
      merged = merged.filter((o) => {
        const d = new Date(o._channel === "instagram" ? (o.orderedAt || o.createdAt) : o.createdAt);
        if (start && d < start) return false;
        if (end)  {
          const endOfDay = new Date(end); endOfDay.setHours(23, 59, 59, 999);
          if (d > endOfDay) return false;
        }
        return true;
      });
    }

    // Sort
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
      const primary = state.sort.sortOrder === "desc" ? bv - av : av - bv;
      if (primary !== 0) return primary;
      const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bc - ac;
    });

    // Shipment + dispatch + search filters
    if (shippedOrderIds && shipmentFilter === "shipped")
      merged = merged.filter((o) => shippedOrderIds.has(o.orderId));
    else if (shippedOrderIds && shipmentFilter === "not_shipped")
      merged = merged.filter((o) => !shippedOrderIds.has(o.orderId));

    if (dispatchedOrderIds && dispatchFilter === "dispatched")
      merged = merged.filter((o) => dispatchedOrderIds.has(o.orderId));
    else if (dispatchedOrderIds && dispatchFilter === "not_dispatched")
      merged = merged.filter((o) => !dispatchedOrderIds.has(o.orderId));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      merged = merged.filter(
        (o) =>
          o.orderId?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.userName?.toLowerCase().includes(q) ||
          o.deliveryAddress?.fullName?.toLowerCase().includes(q),
      );
    }

    const total   = merged.length;
    const pages   = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(state.currentPage, pages);
    const display = merged.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    return { displayOrders: display, totalOrders: total, totalPages: pages };
  }, [
    rawWebsite, rawInstagram,
    state.filters, state.sort, state.currentPage,
    searchQuery, shipmentFilter, shippedOrderIds, dispatchFilter, dispatchedOrderIds,
  ]);

  // ── Exposed actions ───────────────────────────────────────────────────────

  const setPage        = useCallback((p) => dispatch({ type: "SET_PAGE",      payload: p }), []);
  const setFilters     = useCallback((f) => dispatch({ type: "SET_FILTERS",   payload: f }), []);
  const resetFilters   = useCallback(()  => dispatch({ type: "RESET_FILTERS"            }), []);
  const setSort        = useCallback((s) => dispatch({ type: "SET_SORT",      payload: s }), []);
  const selectOrder    = useCallback((o) => dispatch({ type: "SELECT_ORDER",  payload: o }), []);
  const closeDrawer    = useCallback(()  => dispatch({ type: "CLOSE_DRAWER"              }), []);
  const dismissPending = useCallback(()  => dispatch({ type: "DISMISS_PENDING"           }), []);

  // Manual refetch — triggers Redux thunks
  const refetch = useCallback(() => {
    reduxDispatch(fetchWebsiteOrders());
    reduxDispatch(fetchInstagramOrders());
  }, [reduxDispatch]);

  return {
    orders:   displayOrders,
    loading,
    error,
    pagination: {
      currentPage: state.currentPage,
      totalPages,
      totalOrders,
      limit: PAGE_SIZE,
    },
    filters:          state.filters,
    sort:             state.sort,
    selectedOrder:    state.selectedOrder,
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
