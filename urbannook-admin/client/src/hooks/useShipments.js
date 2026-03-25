import { useReducer, useEffect, useRef, useCallback } from "react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

// Fetch all shipments in one request — tabs are filtered client-side for instant switching
const FETCH_LIMIT = 500;

// ── Initial state ──────────────
const initialState = {
  allShipments: [],
  loading: false,
  error: null,
  syncing: false,
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

    case "SYNC_START":
      return { ...state, syncing: true };
    case "SYNC_DONE":
      return { ...state, syncing: false };

    case "FETCH_SUCCESS":
      return { ...state, loading: false, allShipments: action.payload };

    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };

    // Replace a single record in the list (used after assign/track)
    case "UPDATE_SHIPMENT":
      return {
        ...state,
        allShipments: state.allShipments.map((s) =>
          s._id === action.payload._id ? { ...s, ...action.payload } : s,
        ),
      };

    // Remove a record from the list immediately (used after cancel)
    case "REMOVE_SHIPMENT":
      return {
        ...state,
        allShipments: state.allShipments.filter((s) => s._id !== action.payload),
      };

    // Action menu
    case "OPEN_ACTION_MENU":
      return { ...state, actionMenu: { open: true, shipmentId: action.payload } };
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
        trackDrawer: { ...state.trackDrawer, loading: false, trackData: action.payload },
      };
    case "SET_TRACK_ERROR":
      return {
        ...state,
        trackDrawer: { ...state.trackDrawer, loading: false, error: action.payload },
      };
    case "CLOSE_TRACK_DRAWER":
      return {
        ...state,
        trackDrawer: { open: false, shipment: null, trackData: null, loading: false, error: null },
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
        labelModal: { ...state.labelModal, loading: false, label: action.payload },
      };
    case "SET_LABEL_ERROR":
      return {
        ...state,
        labelModal: { ...state.labelModal, loading: false, error: action.payload },
      };
    case "CLOSE_LABEL_MODAL":
      return {
        ...state,
        labelModal: { open: false, shipment: null, label: null, loading: false, error: null },
      };

    // Cancel dialog
    case "OPEN_CANCEL_DIALOG":
      return {
        ...state,
        actionMenu: { open: false, shipmentId: null },
        cancelDialog: { open: true, shipment: action.payload, loading: false, error: null },
      };
    case "SET_CANCEL_LOADING":
      return {
        ...state,
        cancelDialog: { ...state.cancelDialog, loading: true, error: null },
      };
    case "SET_CANCEL_ERROR":
      return {
        ...state,
        cancelDialog: { ...state.cancelDialog, loading: false, error: action.payload },
      };
    case "CLOSE_CANCEL_DIALOG":
      return {
        ...state,
        cancelDialog: { open: false, shipment: null, loading: false, error: null },
      };

    default:
      return state;
  }
}

// ── Hook ───────────────────────
export function useShipments({ refreshKey = 0 } = {}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();
  const abortRef = useRef(null);
  const isMountedRef = useRef(true);

  // ── Fetch all at once (no tab filter — filtering is done client-side) ───────
  const fetchAll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    dispatch({ type: "FETCH_START" });
    try {
      const res = await apiClient.get("/admin/shipmozo/shipments", {
        params: { page: 1, limit: FETCH_LIMIT },
        signal: abortRef.current.signal,
      });
      if (!isMountedRef.current) return;
      dispatch({ type: "FETCH_SUCCESS", payload: res.data.data.shipments });
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
      dispatch({
        type: "FETCH_ERROR",
        payload: err.response?.data?.message || "Failed to load shipments.",
      });
    }
  }, []);

  // Initial load + env switch
  useEffect(() => {
    fetchAll();
    return () => { abortRef.current?.abort(); };
  }, [fetchAll, refreshKey]);

  // Lifecycle cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

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
    const res = await apiClient.get(`/admin/shipmozo/shipments/${shipmentId}/rates`);
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
      const res = await apiClient.get(`/admin/shipmozo/shipments/${shipment._id}/track`);
      if (res.data.data?._normalizedStatus) {
        dispatch({
          type: "UPDATE_SHIPMENT",
          payload: { _id: shipment._id, shipmentStatus: res.data.data._normalizedStatus },
        });
      }
      dispatch({ type: "SET_TRACK_DATA", payload: res.data.data });
    } catch (err) {
      dispatch({
        type: "SET_TRACK_ERROR",
        payload: err.response?.data?.message || "Failed to fetch tracking data.",
      });
    }
  }, []);
  const closeTrackDrawer = useCallback(() => dispatch({ type: "CLOSE_TRACK_DRAWER" }), []);

  // ── Label ────────────────────
  const openLabelModal = useCallback(async (shipment) => {
    dispatch({ type: "OPEN_LABEL_MODAL", payload: shipment });
    try {
      const res = await apiClient.get(`/admin/shipmozo/shipments/${shipment._id}/label`);
      dispatch({ type: "SET_LABEL_DATA", payload: res.data.data?.label ?? null });
    } catch (err) {
      dispatch({
        type: "SET_LABEL_ERROR",
        payload: err.response?.data?.message || "Failed to fetch shipping label.",
      });
    }
  }, []);
  const closeLabelModal = useCallback(() => dispatch({ type: "CLOSE_LABEL_MODAL" }), []);

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
        await apiClient.post(`/admin/shipmozo/shipments/${shipmentId}/cancel`);
        dispatch({ type: "REMOVE_SHIPMENT", payload: shipmentId });
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

  // ── Sync all statuses ────────
  const syncStatuses = useCallback(async () => {
    dispatch({ type: "SYNC_START" });
    try {
      await apiClient.post("/admin/shipmozo/shipments/sync-statuses");
      showToast("Statuses synced successfully.", "success");
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.message || "Sync failed.", "error");
    } finally {
      dispatch({ type: "SYNC_DONE" });
    }
  }, [fetchAll, showToast]);

  // ── Sync single shipment ─────
  const syncSingleShipment = useCallback(
    async (shipmentId) => {
      try {
        const res = await apiClient.post(`/admin/shipmozo/shipments/${shipmentId}/sync`);
        const record = res.data.data?.record;
        if (record) {
          dispatch({ type: "UPDATE_SHIPMENT", payload: record });
        }
        if (res.data.data?.cancelled) {
          dispatch({ type: "REMOVE_SHIPMENT", payload: shipmentId });
          showToast("Order not found on Shipmozo — marked as cancelled.", "info");
        } else {
          showToast("Shipment synced successfully.", "success");
        }
        return res.data.data;
      } catch (err) {
        console.error("[Sync] Error:", err.response?.data ?? err.message);
        const msg = err.response?.data?.message || "Sync failed.";
        showToast(msg, "error");
        throw err;
      }
    },
    [showToast],
  );

  return {
    // State
    allShipments: state.allShipments,
    loading: state.loading,
    error: state.error,
    syncing: state.syncing,
    actionMenu: state.actionMenu,
    assignDrawer: state.assignDrawer,
    trackDrawer: state.trackDrawer,
    labelModal: state.labelModal,
    cancelDialog: state.cancelDialog,
    // Actions
    refetch: fetchAll,
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
    syncStatuses,
    syncSingleShipment,
  };
}
