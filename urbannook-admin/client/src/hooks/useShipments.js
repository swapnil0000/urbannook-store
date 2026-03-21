import { useReducer, useEffect, useRef, useCallback } from "react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

// Tab → status query param mapping
const TAB_STATUS_MAP = {
  ALL: "",
  NEW: "PUSHED",
  ASSIGNED: "ASSIGNED,PICKUP_SCHEDULED",
  TRANSIT: "IN_TRANSIT,OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  RTO: "RTO_INITIATED,RTO_DELIVERED,EXCEPTION,CANCELLED",
};

const PAGE_SIZE = 20;

// ── Initial state ──────────────
const initialState = {
  shipments: [],
  loading: false,
  error: null,
  activeTab: "ALL",
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  // Overlays — only one active at a time
  actionMenu: { open: false, shipmentId: null },
  assignDrawer: { open: false, shipment: null },
  trackDrawer: {
    open: false,
    shipment: null,
    trackData: null,
    loading: false,
    error: null,
  },
  labelModal: {
    open: false,
    shipment: null,
    label: null,
    loading: false,
    error: null,
  },
  cancelDialog: { open: false, shipment: null, loading: false, error: null },
};

// ── Reducer ────────────────────
function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };

    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        shipments: action.payload.shipments,
        totalPages: action.payload.pagination.totalPages,
        totalRecords: action.payload.pagination.totalRecords,
      };

    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };

    case "SET_TAB":
      return { ...state, activeTab: action.payload, currentPage: 1 };

    case "SET_PAGE":
      return { ...state, currentPage: action.payload };

    // Replace a single record in the list (used after assign/cancel/track)
    case "UPDATE_SHIPMENT":
      return {
        ...state,
        shipments: state.shipments.map((s) =>
          s._id === action.payload._id ? { ...s, ...action.payload } : s,
        ),
      };

    // Action menu
    case "OPEN_ACTION_MENU":
      return {
        ...state,
        actionMenu: { open: true, shipmentId: action.payload },
      };
    case "CLOSE_ACTION_MENU":
      return { ...state, actionMenu: { open: false, shipmentId: null } };

    // Assign drawer
    case "OPEN_ASSIGN_DRAWER":
      return {
        ...state,
        actionMenu: { open: false, shipmentId: null },
        assignDrawer: { open: true, shipment: action.payload },
      };
    case "CLOSE_ASSIGN_DRAWER":
      return { ...state, assignDrawer: { open: false, shipment: null } };

    // Track drawer
    case "OPEN_TRACK_DRAWER":
      return {
        ...state,
        actionMenu: { open: false, shipmentId: null },
        trackDrawer: {
          open: true,
          shipment: action.payload,
          trackData: null,
          loading: true,
          error: null,
        },
      };
    case "SET_TRACK_DATA":
      return {
        ...state,
        trackDrawer: {
          ...state.trackDrawer,
          loading: false,
          trackData: action.payload,
        },
      };
    case "SET_TRACK_ERROR":
      return {
        ...state,
        trackDrawer: {
          ...state.trackDrawer,
          loading: false,
          error: action.payload,
        },
      };
    case "CLOSE_TRACK_DRAWER":
      return {
        ...state,
        trackDrawer: {
          open: false,
          shipment: null,
          trackData: null,
          loading: false,
          error: null,
        },
      };

    // Label modal
    case "OPEN_LABEL_MODAL":
      return {
        ...state,
        actionMenu: { open: false, shipmentId: null },
        labelModal: {
          open: true,
          shipment: action.payload,
          label: null,
          loading: true,
          error: null,
        },
      };
    case "SET_LABEL_DATA":
      return {
        ...state,
        labelModal: {
          ...state.labelModal,
          loading: false,
          label: action.payload,
        },
      };
    case "SET_LABEL_ERROR":
      return {
        ...state,
        labelModal: {
          ...state.labelModal,
          loading: false,
          error: action.payload,
        },
      };
    case "CLOSE_LABEL_MODAL":
      return {
        ...state,
        labelModal: {
          open: false,
          shipment: null,
          label: null,
          loading: false,
          error: null,
        },
      };

    // Cancel dialog
    case "OPEN_CANCEL_DIALOG":
      return {
        ...state,
        actionMenu: { open: false, shipmentId: null },
        cancelDialog: {
          open: true,
          shipment: action.payload,
          loading: false,
          error: null,
        },
      };
    case "SET_CANCEL_LOADING":
      return {
        ...state,
        cancelDialog: { ...state.cancelDialog, loading: true, error: null },
      };
    case "SET_CANCEL_ERROR":
      return {
        ...state,
        cancelDialog: {
          ...state.cancelDialog,
          loading: false,
          error: action.payload,
        },
      };
    case "CLOSE_CANCEL_DIALOG":
      return {
        ...state,
        cancelDialog: {
          open: false,
          shipment: null,
          loading: false,
          error: null,
        },
      };

    default:
      return state;
  }
}

// ── Hook ───────────────────────
export function useShipments() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();
  const abortRef = useRef(null);
  const isMountedRef = useRef(true);

  // ── Core fetch ───────────────
  const fetchShipments = useCallback(async (tab, page) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    dispatch({ type: "FETCH_START" });
    try {
      const params = { page, limit: PAGE_SIZE };
      const statusFilter = TAB_STATUS_MAP[tab];
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get("/admin/shipmozo/shipments", {
        params,
        signal: abortRef.current.signal,
      });
      if (!isMountedRef.current) return;
      dispatch({ type: "FETCH_SUCCESS", payload: res.data.data });
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
      const msg = err.response?.data?.message || "Failed to load shipments.";
      dispatch({ type: "FETCH_ERROR", payload: msg });
    }
  }, []);

  // Re-fetch when tab or page changes
  useEffect(() => {
    fetchShipments(state.activeTab, state.currentPage);
    return () => {
      abortRef.current?.abort();
    };
  }, [state.activeTab, state.currentPage, fetchShipments]);

  // Lifecycle cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // ── Simple nav actions ───────
  const setTab = useCallback(
    (tab) => dispatch({ type: "SET_TAB", payload: tab }),
    [],
  );
  const setPage = useCallback(
    (page) => dispatch({ type: "SET_PAGE", payload: page }),
    [],
  );
  const refetch = useCallback(
    () => fetchShipments(state.activeTab, state.currentPage),
    [state.activeTab, state.currentPage, fetchShipments],
  );

  // ── Action menu ──────────────
  const openActionMenu = useCallback(
    (shipmentId) => dispatch({ type: "OPEN_ACTION_MENU", payload: shipmentId }),
    [],
  );
  const closeActionMenu = useCallback(
    () => dispatch({ type: "CLOSE_ACTION_MENU" }),
    [],
  );

  // ── Assign courier ───────────
  const openAssignDrawer = useCallback(
    (shipment) => dispatch({ type: "OPEN_ASSIGN_DRAWER", payload: shipment }),
    [],
  );
  const closeAssignDrawer = useCallback(
    () => dispatch({ type: "CLOSE_ASSIGN_DRAWER" }),
    [],
  );

  const fetchRates = useCallback(async (shipmentId) => {
    const res = await apiClient.get(
      `/admin/shipmozo/shipments/${shipmentId}/rates`,
    );
    return res.data.data;
  }, []);

  const confirmAssign = useCallback(
    async (shipmentId, courierId) => {
      const res = await apiClient.post(
        `/admin/shipmozo/shipments/${shipmentId}/assign`,
        { courierId },
      );
      dispatch({ type: "UPDATE_SHIPMENT", payload: res.data.data });
      dispatch({ type: "CLOSE_ASSIGN_DRAWER" });
      showToast("Courier assigned successfully.", "success");
    },
    [showToast],
  );

  // ── Track ────────────────────
  const openTrackDrawer = useCallback(async (shipment) => {
    dispatch({ type: "OPEN_TRACK_DRAWER", payload: shipment });
    try {
      const res = await apiClient.get(
        `/admin/shipmozo/shipments/${shipment._id}/track`,
      );
      // Also sync the status in the row
      if (res.data.data?.current_status) {
        dispatch({
          type: "UPDATE_SHIPMENT",
          payload: {
            _id: shipment._id,
            shipmentStatus: res.data.data.current_status,
          },
        });
      }
      dispatch({ type: "SET_TRACK_DATA", payload: res.data.data });
    } catch (err) {
      dispatch({
        type: "SET_TRACK_ERROR",
        payload:
          err.response?.data?.message || "Failed to fetch tracking data.",
      });
    }
  }, []);
  const closeTrackDrawer = useCallback(
    () => dispatch({ type: "CLOSE_TRACK_DRAWER" }),
    [],
  );

  // ── Label ────────────────────
  const openLabelModal = useCallback(async (shipment) => {
    dispatch({ type: "OPEN_LABEL_MODAL", payload: shipment });
    try {
      const res = await apiClient.get(
        `/admin/shipmozo/shipments/${shipment._id}/label`,
      );
      dispatch({
        type: "SET_LABEL_DATA",
        payload: res.data.data?.label ?? null,
      });
    } catch (err) {
      dispatch({
        type: "SET_LABEL_ERROR",
        payload:
          err.response?.data?.message || "Failed to fetch shipping label.",
      });
    }
  }, []);
  const closeLabelModal = useCallback(
    () => dispatch({ type: "CLOSE_LABEL_MODAL" }),
    [],
  );

  // ── Cancel ───────────────────
  const openCancelDialog = useCallback(
    (shipment) => dispatch({ type: "OPEN_CANCEL_DIALOG", payload: shipment }),
    [],
  );
  const closeCancelDialog = useCallback(
    () => dispatch({ type: "CLOSE_CANCEL_DIALOG" }),
    [],
  );

  const confirmCancel = useCallback(
    async (shipmentId) => {
      dispatch({ type: "SET_CANCEL_LOADING" });
      try {
        const res = await apiClient.post(
          `/admin/shipmozo/shipments/${shipmentId}/cancel`,
        );
        dispatch({ type: "UPDATE_SHIPMENT", payload: res.data.data });
        dispatch({ type: "CLOSE_CANCEL_DIALOG" });
        showToast("Shipment cancelled.", "info");
      } catch (err) {
        dispatch({
          type: "SET_CANCEL_ERROR",
          payload: err.response?.data?.message || "Failed to cancel shipment.",
        });
      }
    },
    [showToast],
  );

  return {
    // State
    shipments: state.shipments,
    loading: state.loading,
    error: state.error,
    activeTab: state.activeTab,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    totalRecords: state.totalRecords,
    actionMenu: state.actionMenu,
    assignDrawer: state.assignDrawer,
    trackDrawer: state.trackDrawer,
    labelModal: state.labelModal,
    cancelDialog: state.cancelDialog,
    // Actions
    setTab,
    setPage,
    refetch,
    openActionMenu,
    closeActionMenu,
    openAssignDrawer,
    closeAssignDrawer,
    fetchRates,
    confirmAssign,
    openTrackDrawer,
    closeTrackDrawer,
    openLabelModal,
    closeLabelModal,
    openCancelDialog,
    closeCancelDialog,
    confirmCancel,
  };
}
