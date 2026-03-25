/**
 * emailService.js
 *
 * Singleton Zoho SMTP transporter + retry-aware send core.
 * HTML templates live in server/templates/ — one file per email type.
 *
 * Idempotency: guards are in the DB (dispatchConfirmedAt, transitEmailSentAt,
 * deliveredEmailSentAt on ShipmentRecord). The controller sets the lock before
 * calling these functions — so each email fires exactly once per shipment.
 *
 * Required env vars (server/.env):
 *   ZOHO_ADMIN_EMAIL   e.g. orders@urbannook.in
 *   ZOHO_SMTP_SECRET   Zoho app-specific password
 */

import nodemailer from "nodemailer";
import dispatchTemplate from "../templates/dispatch.template.js";
import inTransitTemplate from "../templates/inTransit.template.js";
import deliveredTemplate from "../templates/delivered.template.js";

// ── Singleton transporter ─────────────────────────────────────────────────────

let _transporter = null;

const getTransporter = () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_ADMIN_EMAIL,
        pass: process.env.ZOHO_SMTP_SECRET,
      },
    });
  }
  return _transporter;
};

// ── Core: retry-aware send ────────────────────────────────────────────────────

const sendEmailWithRetry = async (to, subject, html, retries = 3) => {
  const transporter = getTransporter();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: `"UrbanNook" <${process.env.ZOHO_ADMIN_EMAIL}>`,
        to,
        subject,
        html,
      });
      console.log(
        `[emailService] Sent to ${to} — Message-ID: ${info.messageId}`,
      );
      return;
    } catch (err) {
      console.error(
        `[emailService] Attempt ${attempt}/${retries} failed for ${to}:`,
        err.message,
      );
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt)); // exponential backoff
    }
  }
};

// ── Stage 1: Dispatch (AWB received / courier pickup) ─────────────────────────

export const sendDispatchEmail = ({
  to,
  customerName,
  orderId,
  awbNumber,
  courierCompany,
  items,
  amount,
  deliveryAddress,
  mobileNumber,
}) =>
  sendEmailWithRetry(
    to,
    `Your UrbanNook order ${orderId} has been dispatched!`,
    dispatchTemplate({ customerName, orderId, awbNumber, courierCompany, items, amount, deliveryAddress, mobileNumber }),
  );

// ── Stage 2: In Transit ───────────────────────────────────────────────────────

export const sendInTransitEmail = ({
  to,
  customerName,
  orderId,
  awbNumber,
  courierCompany,
  items,
  amount,
  deliveryAddress,
  mobileNumber,
}) =>
  sendEmailWithRetry(
    to,
    `Your UrbanNook order ${orderId} is in transit!`,
    inTransitTemplate({ customerName, orderId, awbNumber, courierCompany, items, amount, deliveryAddress, mobileNumber }),
  );

// ── Stage 3: Delivered ────────────────────────────────────────────────────────

export const sendDeliveredEmail = ({
  to,
  customerName,
  orderId,
  awbNumber,
  courierCompany,
  items,
  amount,
  deliveryAddress,
  mobileNumber,
}) =>
  sendEmailWithRetry(
    to,
    `Your UrbanNook order ${orderId} has been delivered!`,
    deliveredTemplate({ customerName, orderId, awbNumber, courierCompany, items, amount, deliveryAddress, mobileNumber }),
  );
