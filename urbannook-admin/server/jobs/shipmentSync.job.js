/**
 * shipmentSync.job.js
 *
 * Two-tier automatic background sync for Shipmozo shipments.
 *
 * Tier 1 — every 5 min  → Orders with NO AWB yet (waiting for courier assignment).
 * Tier 2 — every 30 min → Orders that already have an AWB (status + email updates).
 *
 * Rate-limiting strategy (prevents API hammering + SMTP overload):
 *  - MAX_PER_RUN   : hard cap on how many orders are processed per cron tick.
 *                    Remaining orders are picked up in the next tick.
 *  - CALL_DELAY_MS : pause between consecutive Shipmozo API calls.
 *  - EMAIL_DELAY_MS: pause between consecutive email sends.
 *  - Overlap guard : if the previous run of the same tier is still in progress
 *                    the new tick is skipped entirely (no concurrent runs).
 */

import cron from "node-cron";
import ShipmentRecord from "../models/shipment.record.model.js";
import * as shipmozoService from "../services/shipmozoService.js";
import {
  TERMINAL_STATUSES,
  normalizeTrackingStatus,
  isValidAwb,
  writeTrackingToSourceOrder,
  maybeFireDispatchEmail,
  maybeFireTransitEmail,
  maybeFireDeliveredEmail,
} from "../controllers/shipmozo.controller.js";

// ─── Throttle config ──────────────────────────────────────────────────────────

/** Max orders processed per cron tick. Extras are deferred to the next tick. */
const MAX_PER_RUN_T1 = 10; // Tier 1 (no-AWB orders, light calls)
const MAX_PER_RUN_T2 = 15; // Tier 2 (active orders, heavier — track + email)

/** Pause between consecutive Shipmozo API calls (ms). */
const CALL_DELAY_MS = 600;

/** Pause between consecutive email sends (ms). */
const EMAIL_DELAY_MS = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Overlap guards ───────────────────────────────────────────────────────────
let tier1Running = false;
let tier2Running = false;

// ─── Tier 1: detect AWB for newly-pushed orders ───────────────────────────────
async function tier1SyncNoAwbOrders() {
  if (tier1Running) {
    console.log("[ShipSync:T1] Still running — skipping this tick");
    return;
  }
  tier1Running = true;
  const tag = "[ShipSync:T1]";

  try {
    const allPending = await ShipmentRecord.find({
      awbNumber: null,
      isCancelled: { $ne: true },
      shipmozoOrderId: { $ne: null },
      shipmentStatus: { $nin: ["CANCELLED"] },
    }).lean();

    if (allPending.length === 0) return;

    // Cap: process at most MAX_PER_RUN_T1 orders this tick
    const batch = allPending.slice(0, MAX_PER_RUN_T1);
    console.log(
      `${tag} ${batch.length}/${allPending.length} order(s) this tick (cap: ${MAX_PER_RUN_T1})`,
    );

    for (const lean of batch) {
      try {
        // ── Shipmozo API call ──────────────────────────────────────────────
        const result = await shipmozoService.getOrderDetail(
          lean.shipmozoOrderId,
        );
        await sleep(CALL_DELAY_MS); // throttle — wait before next call

        const rawData = result?.data;
        const detail = Array.isArray(rawData)
          ? rawData[0]
          : (rawData ?? result);

        const sd = Array.isArray(detail?.shipping_details)
          ? null
          : (detail?.shipping_details ?? null);
        const awb = sd?.awb_number ?? detail?.awb_number ?? detail?.awb ?? null;
        const courier =
          sd?.courier_company ??
          (typeof detail?.courier === "string"
            ? detail.courier
            : (detail?.courier?.name ?? null));

        const awbCleaned = awb ? String(awb).trim() : null;
        if (!isValidAwb(awbCleaned)) continue; // no AWB assigned yet

        // Re-fetch full Mongoose doc to save
        const record = await ShipmentRecord.findById(lean._id);
        if (!record || record.awbNumber) continue; // another run already handled it

        record.awbNumber = awbCleaned;
        if (courier && !record.courierCompany) record.courierCompany = courier;
        record.lastTrackedAt = new Date();
        await record.save();

        console.log(
          `${tag} ✅ AWB "${awbCleaned}" saved for ${record.sourceOrderId}`,
        );

        // ── Update Order.trackingInfo ──────────────────────────────────────
        await writeTrackingToSourceOrder(record);

        // ── Dispatch email (throttled) ─────────────────────────────────────
        await maybeFireDispatchEmail(record);
        await sleep(EMAIL_DELAY_MS);
      } catch (err) {
        console.error(`${tag} Error on ${lean.sourceOrderId}:`, err.message);
      }
    }

    if (allPending.length > MAX_PER_RUN_T1) {
      console.log(
        `${tag} ${allPending.length - MAX_PER_RUN_T1} order(s) deferred to next tick`,
      );
    }
  } catch (err) {
    console.error(`${tag} Fatal:`, err.message);
  } finally {
    tier1Running = false;
  }
}

// ─── Tier 2: sync status for shipments that already have an AWB ───────────────
async function tier2SyncActiveShipments() {
  if (tier2Running) {
    console.log("[ShipSync:T2] Still running — skipping this tick");
    return;
  }
  tier2Running = true;
  const tag = "[ShipSync:T2]";

  try {
    const allActive = await ShipmentRecord.find({
      awbNumber: { $ne: null },
      isCancelled: { $ne: true },
      shipmentStatus: { $nin: [...TERMINAL_STATUSES] },
    });

    if (allActive.length === 0) return;

    const batch = allActive.slice(0, MAX_PER_RUN_T2);
    console.log(
      `${tag} ${batch.length}/${allActive.length} shipment(s) this tick (cap: ${MAX_PER_RUN_T2})`,
    );

    for (const record of batch) {
      // ── Track status (best-effort — failure never blocks emails) ──────────
      try {
        const trackResult = await shipmozoService.trackOrder(record.awbNumber);
        await sleep(CALL_DELAY_MS);

        const rawTrackData = trackResult?.data;
        const trackData = Array.isArray(rawTrackData)
          ? rawTrackData[0]
          : rawTrackData;

        const mapped = normalizeTrackingStatus(trackData?.current_status);
        if (mapped && mapped !== record.shipmentStatus) {
          console.log(
            `${tag} ${record.sourceOrderId}: ${record.shipmentStatus} → ${mapped}`,
          );
          record.shipmentStatus = mapped;
          if (mapped === "CANCELLED") record.isCancelled = true;
        }

        if (trackData?.expected_delivery_date) {
          const edd = new Date(trackData.expected_delivery_date);
          if (!isNaN(edd.getTime())) record.expectedDeliveryDate = edd;
        }

        record.lastTrackedAt = new Date();
        await record.save();
        await writeTrackingToSourceOrder(record);
      } catch (trackErr) {
        console.error(
          `${tag} Track failed for ${record.sourceOrderId}:`,
          trackErr.message,
        );

        // Edge case: AWB might be wrong/stale — re-verify via getOrderDetail and correct if needed
        if (record.shipmozoOrderId) {
          try {
            const detailRes = await shipmozoService.getOrderDetail(
              record.shipmozoOrderId,
            );
            const rawDetail = detailRes?.data;
            const orderDetail = Array.isArray(rawDetail)
              ? rawDetail[0]
              : (rawDetail ?? detailRes);
            const sd = Array.isArray(orderDetail?.shipping_details)
              ? null
              : (orderDetail?.shipping_details ?? null);
            const freshAwb =
              sd?.awb_number ??
              orderDetail?.awb_number ??
              orderDetail?.awb ??
              null;
            const cleaned = freshAwb ? String(freshAwb).trim() : null;

            if (isValidAwb(cleaned) && cleaned !== record.awbNumber) {
              console.log(
                `${tag} AWB corrected: "${record.awbNumber}" → "${cleaned}"`,
              );
              record.awbNumber = cleaned;
              await record.save();
              await writeTrackingToSourceOrder(record);
            }
          } catch (_) {
            /* non-fatal — will retry next tick */
          }
        }
      }

      // ── Stage emails — always attempted regardless of track result ────────
      try {
        await maybeFireDispatchEmail(record);
        await sleep(EMAIL_DELAY_MS);

        await maybeFireTransitEmail(record);
        await sleep(EMAIL_DELAY_MS);

        await maybeFireDeliveredEmail(record);
        await sleep(EMAIL_DELAY_MS);
      } catch (emailErr) {
        console.error(
          `${tag} Email error for ${record.sourceOrderId}:`,
          emailErr.message,
        );
      }
    }

    if (allActive.length > MAX_PER_RUN_T2) {
      console.log(
        `${tag} ${allActive.length - MAX_PER_RUN_T2} shipment(s) deferred to next tick`,
      );
    }
    console.log(`${tag} Done`);
  } catch (err) {
    console.error(`${tag} Fatal:`, err.message);
  } finally {
    tier2Running = false;
  }
}

// ─── Cron schedule handles ────────────────────────────────────────────────────
let tier1Task = null;
let tier2Task = null;

export function startShipmentSyncJob() {
  tier1Task = cron.schedule("*/5 * * * *", tier1SyncNoAwbOrders);
  tier2Task = cron.schedule("*/30 * * * *", tier2SyncActiveShipments);
  console.log(
    "[ShipSync] Started → T1: 5 min (cap 10) | T2: 30 min (cap 15) | delays: API 600ms / Email 400ms",
  );
}

export function stopShipmentSyncJob() {
  tier1Task?.stop();
  tier2Task?.stop();
  console.log("[ShipSync] Stopped");
}
