import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../api/axios";

const FETCH_LIMIT = 500;

// ── Async thunks ─────────────────────────────────────────────────────────────

export const fetchWebsiteOrders = createAsyncThunk(
  "orders/fetchWebsite",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/admin/orders", {
        params: { page: 1, limit: FETCH_LIMIT },
      });
      return res.data.data?.orders ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch website orders.");
    }
  },
);

export const fetchInstagramOrders = createAsyncThunk(
  "orders/fetchInstagram",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/admin/orders/instagram", {
        params: { page: 1, limit: FETCH_LIMIT },
      });
      return res.data.data?.orders ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch Instagram orders.");
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    website:          [],
    instagram:        [],
    loadingWebsite:   false,
    loadingInstagram: false,
    errorWebsite:     null,
    errorInstagram:   null,
    // Monotonically-increasing counter — bumped on every SSE new-order event.
    // Components that want to react to new arrivals watch this value.
    newEventCount: 0,
  },
  reducers: {
    // Called by OrdersSyncProvider on env switch — clears stale data before re-fetch
    resetOrders(state) {
      state.website          = [];
      state.instagram        = [];
      state.errorWebsite     = null;
      state.errorInstagram   = null;
      state.newEventCount    = 0;
    },
    // SSE — new website order arrived
    newWebsiteOrder(state, action) {
      const order = { ...action.payload, _channel: "website" };
      if (!state.website.some((o) => o._id === order._id || o.orderId === order.orderId)) {
        state.website.unshift(order);
        state.newEventCount++;
      }
    },
    // SSE — new Instagram order arrived
    newInstagramOrder(state, action) {
      const order = { ...action.payload, _channel: "instagram" };
      if (!state.instagram.some((o) => o._id === order._id || o.orderId === order.orderId)) {
        state.instagram.unshift(order);
        state.newEventCount++;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Website fetch
      .addCase(fetchWebsiteOrders.pending,   (state) => { state.loadingWebsite = true;  state.errorWebsite  = null; })
      .addCase(fetchWebsiteOrders.fulfilled, (state, action) => {
        state.loadingWebsite = false;
        state.website = action.payload.map((o) => ({ ...o, _channel: "website" }));
      })
      .addCase(fetchWebsiteOrders.rejected,  (state, action) => {
        state.loadingWebsite = false;
        state.errorWebsite   = action.payload;
      })
      // Instagram fetch
      .addCase(fetchInstagramOrders.pending,   (state) => { state.loadingInstagram = true;  state.errorInstagram  = null; })
      .addCase(fetchInstagramOrders.fulfilled, (state, action) => {
        state.loadingInstagram = false;
        state.instagram = action.payload.map((o) => ({ ...o, _channel: "instagram" }));
      })
      .addCase(fetchInstagramOrders.rejected,  (state, action) => {
        state.loadingInstagram = false;
        state.errorInstagram   = action.payload;
      });
  },
});

export const { resetOrders, newWebsiteOrder, newInstagramOrder } = ordersSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectWebsiteOrders   = (state) => state.orders.website;
export const selectInstagramOrders = (state) => state.orders.instagram;
export const selectOrdersLoading   = (state) => state.orders.loadingWebsite || state.orders.loadingInstagram;
export const selectOrdersError     = (state) => state.orders.errorWebsite   || state.orders.errorInstagram;
export const selectNewEventCount   = (state) => state.orders.newEventCount;

export default ordersSlice.reducer;
