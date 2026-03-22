/**
 * Razorpay Webhook Handler
 *
 * Security: signature is verified using HMAC-SHA256 before any DB write.
 * The raw request body (Buffer) is required — must be registered BEFORE
 * express.json() in index.js.
 *
 * Supported events:
 *   payment_link.paid  — payment link was paid (primary event for IG orders)
 *   payment.captured   — fallback for direct payment captures
 */
import crypto from "crypto";
import InstagramOrder from "../models/instagram.order.model.js";

export async function razorpayWebhook(req, res) {
  // 1. Verify signature ──────────────────────────────────────────────────────
  const webhookSecret = process.env.RP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhook] RP_WEBHOOK_SECRET is not set.");
    return res.status(500).json({ error: "Webhook secret not configured." });
  }

  const receivedSignature = req.headers["x-razorpay-signature"];
  console.log("[Webhook] Hit — event header:", req.headers["x-razorpay-event-id"] ?? "none", "| has signature:", !!receivedSignature);
  if (!receivedSignature) {
    return res.status(400).json({ error: "Missing x-razorpay-signature header." });
  }

  // req.body is a raw Buffer (express.raw middleware applied in routes/webhooks.js)
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: "Raw body not available." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const signaturesMatch = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(receivedSignature,  "hex"),
  );

  if (!signaturesMatch) {
    console.warn("[Webhook] Signature mismatch — possible spoofed request.");
    return res.status(400).json({ error: "Invalid signature." });
  }

  // 2. Parse payload ─────────────────────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }

  const eventType = event.event;
  console.log(`[Webhook] Received event: ${eventType}`);

  // 3. Handle payment.captured — fires for both payment links AND standard orders ──
  if (eventType === "payment.captured" || eventType === "payment_link.paid") {
    const payment = event.payload?.payment?.entity;
    if (!payment) return res.status(200).json({ status: "ignored" });

    const razorpayPaymentId = payment.id;
    const razorpayOrderId   = payment.order_id; // set for standard Razorpay orders

    // Try matching by razorpayOrderId first (custom checkout flow)
    let updated = null;
    if (razorpayOrderId) {
      updated = await InstagramOrder.findOneAndUpdate(
        { razorpayOrderId, status: { $ne: "PAID" } },
        { status: "PAID", razorpayPaymentId },
        { new: true },
      ).catch((e) => { console.error("[Webhook] DB error:", e.message); return null; });
    }

    // Fallback: match by orderId in notes (legacy / payment link flow)
    if (!updated) {
      const orderId = payment.notes?.orderId
        ?? payment.description?.match(/IG-\d+/)?.[0]
        ?? null;

      if (orderId) {
        updated = await InstagramOrder.findOneAndUpdate(
          { orderId, status: { $ne: "PAID" } },
          { status: "PAID", razorpayPaymentId,
            ...(payment.contact && { contactNumber: payment.contact }),
            ...(payment.email   && { email: payment.email }),
          },
          { new: true },
        ).catch((e) => { console.error("[Webhook] DB error:", e.message); return null; });
      }
    }

    if (updated) {
      console.log(`[Webhook] Order ${updated.orderId} marked PAID.`);
    }

    return res.status(200).json({ status: "ok" });
  }

  // 4. All other events — acknowledge and ignore ─────────────────────────────
  return res.status(200).json({ status: "ignored", event: eventType });
}
