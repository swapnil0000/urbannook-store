/**
 * Razorpay Payment Link service.
 * Uses the Razorpay REST API directly (no SDK needed).
 * Docs: https://razorpay.com/docs/api/payment-links/
 */
import axios from "axios";

const BASE_URL = "https://api.razorpay.com/v1";

function getAuth() {
  const keyId     = process.env.RP_KEY_ID;
  const keySecret = process.env.RP_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials (RP_KEY_ID / RP_SECRET) are not set.");
  }
  return { username: keyId, password: keySecret };
}

/**
 * Create a Razorpay Payment Link.
 *
 * @param {object} opts
 * @param {string} opts.orderId        - Internal order ID used as reference_id (e.g. "IG-0012")
 * @param {string} opts.customerName   - Customer's name
 * @param {number} opts.amountRupees   - Amount in INR (will be converted to paise)
 * @returns {Promise<{ id, short_url, payment_link_url }>}
 */
export async function createPaymentLink({ orderId, customerName, amountRupees }) {
  const amountPaise = Math.round(amountRupees * 100);

  const payload = {
    amount:       amountPaise,
    currency:     "INR",
    accept_partial: false,
    reference_id: orderId,
    description:  `UrbanNook order ${orderId}`,
    customer: {
      name: customerName,
    },
    notify: {
      sms:   false,
      email: false,
    },
    reminder_enable: false,
    // Ask customer to fill shipping address on the Razorpay checkout page
    // (works in live/production mode; silently ignored in test mode)
    options: {
      checkout: {
        shipping_address: {
          enabled:  true,
          required: true,
        },
      },
    },
  };

  const response = await axios.post(`${BASE_URL}/payment_links`, payload, {
    auth:    getAuth(),
    headers: { "Content-Type": "application/json" },
    timeout: 10_000,
  });

  return response.data; // { id, short_url, payment_link_url, ... }
}
