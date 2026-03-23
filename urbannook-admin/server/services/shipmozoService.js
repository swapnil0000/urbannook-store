import axios from "axios";
import { ApiError } from "../utils/apiResponse.js";

// Created once at module load.
// Auth headers and baseURL are applied lazily via the request interceptor below
// so that dotenv has had time to populate process.env before the first request.
const shipmozoClient = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json",
  },
});

// Read credentials and baseURL at request time, not at module-load time.
// Fixes: ES-module hoisting causes this file to initialize before dotenv.config()
// runs in index.js, so process.env.SHIPMOZO_* would be undefined at creation time.
shipmozoClient.interceptors.request.use((config) => {
  config.baseURL = process.env.SHIPMOZO_BASE_URL;
  config.headers["public-key"] = process.env.SHIPMOZO_PUBLIC_KEY;
  config.headers["private-key"] = process.env.SHIPMOZO_PRIVATE_KEY;
  return config;
});

// Dual error handling:
//   1. HTTP-level errors (4xx/5xx) → rethrow as ApiError with HTTP status
//   2. HTTP 200 but result === "0" → throw ApiError(502) — upstream logical failure,
//      distinguishable from our own 4xx errors
shipmozoClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.result === "0") {
      console.error(
        "[Shipmozo] API logical failure:",
        JSON.stringify(response.data),
      );
      // Prefer the nested data.error detail over the top-level message (which is often just "Error")
      const detail =
        (response.data.data && Object.values(response.data.data)[0]) ||
        response.data.message ||
        "Shipmozo API returned a failure response.";
      throw new ApiError(502, detail);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status || 502;
    const message =
      error.response?.data?.message ||
      error.message ||
      "Shipmozo API request failed.";
    console.error(
      "[Shipmozo] HTTP error:",
      status,
      JSON.stringify(error.response?.data),
    );
    throw new ApiError(status, message);
  },
);

/**
 * Push a new order to Shipmozo.
 * @param {object} payload - Fully-built Shipmozo push-order payload
 */
async function pushOrder(payload) {
  const response = await shipmozoClient.post("/push-order", payload);
  return response.data;
}

/**
 * Fetch the list of warehouses registered in Shipmozo.
 */
async function getWarehouses() {
  const response = await shipmozoClient.get("/get-warehouses");
  return response.data;
}

/**
 * Health/info check — useful for verifying API keys at startup.
 */
async function checkApiHealth() {
  const response = await shipmozoClient.get("/info");
  return response.data;
}

/**
 * Fetch courier rate options for a shipment.
 * @param {object} payload - Full rate-calculator payload
 */
async function getRates(payload) {
  const response = await shipmozoClient.post("/rate-calculator", payload);
  return response.data;
}

/**
 * Assign a specific courier to an order.
 * @param {{ order_id: string, courier_id: number }} payload
 */
async function assignCourier(payload) {
  const response = await shipmozoClient.post("/assign-courier", payload);
  return response.data;
}

/**
 * Fetch the shipping label (base64 PNG) for an AWB number.
 * @param {string} awbNumber
 */
async function getLabel(awbNumber) {
  const response = await shipmozoClient.get(`/get-order-label/${awbNumber}`);
  return response.data;
}

/**
 * Cancel an order on Shipmozo.
 * @param {{ order_id: string, awb_number: number }} payload — awb_number must be numeric
 */
async function cancelOrder(payload) {
  const response = await shipmozoClient.post("/cancel-order", payload);
  return response.data;
}

/**
 * Track an order by its AWB number.
 * @param {string} awbNumber
 */
async function trackOrder(awbNumber) {
  const response = await shipmozoClient.get("/track-order", {
    params: { awb_number: awbNumber },
  });
  return response.data;
}

/**
 * Schedule a pickup for an order (for couriers that don't auto-schedule).
 * @param {string} orderId
 */
async function schedulePickup(orderId) {
  const response = await shipmozoClient.post("/schedule-pickup", {
    order_id: orderId,
  });
  return response.data;
}

export {
  pushOrder,
  getWarehouses,
  checkApiHealth,
  getRates,
  assignCourier,
  getLabel,
  cancelOrder,
  trackOrder,
  schedulePickup,
};
