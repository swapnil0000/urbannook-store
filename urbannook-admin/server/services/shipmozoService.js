const axios = require("axios");
const { ApiError } = require("../utils/apiResponse");

// Created once at module load — never recreated per request
const shipmozoClient = axios.create({
  baseURL: process.env.SHIPMOZO_BASE_URL, // no trailing slash
  timeout: 15000,
  headers: {
    "public-key": process.env.SHIPMOZO_PUBLIC_KEY,
    "private-key": process.env.SHIPMOZO_PRIVATE_KEY,
    "Content-Type": "application/json",
    accept: "application/json",
  },
});

// Dual error handling:
//   1. HTTP-level errors (4xx/5xx) → rethrow as ApiError with HTTP status
//   2. HTTP 200 but result === "0" → throw ApiError(502) — upstream logical failure,
//      distinguishable from our own 4xx errors
shipmozoClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.result === "0") {
      console.error("[Shipmozo] API logical failure:", JSON.stringify(response.data));
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
    console.error("[Shipmozo] HTTP error:", status, JSON.stringify(error.response?.data));
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

module.exports = { pushOrder, getWarehouses, checkApiHealth };
