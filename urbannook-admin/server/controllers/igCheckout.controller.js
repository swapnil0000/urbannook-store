/**
 * Public endpoints consumed by the UrbanNook store's /ig-checkout/:orderId page.
 *
 * Flow:
 *  1. Store page loads  → GET  /api/v1/ig-checkout/:orderId   (fetch order details)
 *  2. Customer submits  → POST /api/v1/ig-checkout/:orderId/pay (create Razorpay order)
 *  3. Customer pays via Razorpay JS SDK on the store page
 *  4. Razorpay webhook  → POST /api/v1/webhooks/razorpay       (mark PAID + save address)
 *
 * Security:
 *  - Amount is NEVER trusted from the frontend — always read from DB.
 *  - Orders with status !== "CREATED" are rejected at /pay.
 */
import axios from "axios";
import crypto   from "crypto";
import InstagramOrder from "../models/instagram.order.model.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";

// ─── helpers ──────────────────────────────────────────────────────────────────
function getRazorpayAuth() {
  return {
    username: process.env.RP_KEY_ID,
    password: process.env.RP_SECRET,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/ig-checkout/:orderId
// Store page calls this to render the checkout UI.
// ─────────────────────────────────────────────────────────────────────────────
export const getCheckoutOrder = async (req, res, next) => {
  try {
    const order = await InstagramOrder.findOne(
      { orderId: req.params.orderId },
      "orderId customerName amount status notes items",
    ).lean();

    if (!order) throw new ApiError(404, "Order not found.");

    if (order.status === "PAID") {
      return res.status(200).json(
        new ApiResponse(200, "Order already paid.", { ...order, alreadyPaid: true }),
      );
    }

    if (order.status === "FAILED") {
      return res.status(200).json(
        new ApiResponse(200, "Order expired or failed.", { ...order, expired: true }),
      );
    }

    return res.status(200).json(
      new ApiResponse(200, "Order fetched successfully.", order),
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/ig-checkout/:orderId/pay
// Store page calls this after customer fills address + clicks Pay.
// Creates a Razorpay order and returns razorpay_order_id + key_id.
// Amount is read from DB — frontend cannot tamper it.
// ─────────────────────────────────────────────────────────────────────────────
export const initiateCheckoutPayment = async (req, res, next) => {
  try {
    const { name, phone, email, address } = req.body;

    // Basic validation
    const errs = [];
    if (!name?.trim())    errs.push("Name is required.");
    if (!phone?.trim())   errs.push("Phone is required.");
    if (!address?.trim()) errs.push("Address is required.");
    if (errs.length)      throw new ApiError(400, errs.join(" "));

    const order = await InstagramOrder.findOne({ orderId: req.params.orderId });
    if (!order) throw new ApiError(404, "Order not found.");

    if (order.status === "PAID")   throw new ApiError(409, "This order has already been paid.");
    if (order.status === "FAILED") throw new ApiError(410, "This order link has expired.");

    // Amount is the source of truth from DB — never from request body
    const amountPaise = Math.round(order.amount * 100);

    // Create Razorpay order via REST API
    const rzpResponse = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount:   amountPaise,
        currency: "INR",
        receipt:  order.orderId,
        notes: {
          orderId:     order.orderId,
          customerName: name.trim(),
        },
      },
      {
        auth:    getRazorpayAuth(),
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
      },
    );

    const razorpayOrder = rzpResponse.data;

    // Save customer details now so webhook can just update status
    order.contactNumber   = phone.trim();
    order.email           = email?.trim() || undefined;
    order.deliveryAddress = address.trim();
    order.customerName    = name.trim();
    // Store razorpay order id for webhook matching
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.status(200).json(
      new ApiResponse(200, "Razorpay order created.", {
        razorpayOrderId: razorpayOrder.id,
        amount:          amountPaise,
        currency:        "INR",
        keyId:           process.env.RP_KEY_ID,
        customerName:    name.trim(),
        email:           email?.trim() || "",
        phone:           phone.trim(),
        orderId:         order.orderId,
      }),
    );
  } catch (err) {
    if (err.response?.data) {
      console.error("[igCheckout] Razorpay error:", err.response.data);
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/ig-checkout/:orderId/verify
// Store page calls this after Razorpay payment handler succeeds (client-side).
// Verifies signature and marks order PAID immediately (webhook is the backup).
// ─────────────────────────────────────────────────────────────────────────────
export const verifyCheckoutPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    console.log("[verifyCheckoutPayment] called for orderId:", req.params.orderId, {
      razorpayOrderId,
      razorpayPaymentId,
      hasSignature: !!razorpaySignature,
    });

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new ApiError(400, "Missing payment verification fields.");
    }

    // Verify HMAC signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RP_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      console.error("[verifyCheckoutPayment] Signature mismatch for orderId:", req.params.orderId);
      throw new ApiError(400, "Payment signature verification failed.");
    }

    // Mark order as PAID (idempotent)
    const order = await InstagramOrder.findOneAndUpdate(
      { orderId: req.params.orderId, status: { $ne: "PAID" } },
      { status: "PAID", razorpayPaymentId },
      { new: true },
    );

    if (!order) {
      return res.status(200).json(new ApiResponse(200, "Payment already recorded.", null));
    }

    console.log("[verifyCheckoutPayment] Order marked PAID:", order.orderId);
    return res.status(200).json(
      new ApiResponse(200, "Payment verified successfully.", { orderId: order.orderId }),
    );
  } catch (err) {
    next(err);
  }
};
