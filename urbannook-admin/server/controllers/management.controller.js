import Order from "../models/order.model.js";
import InstagramOrder from "../models/instagram.order.model.js";
import ShipmentRecord from "../models/shipment.record.model.js";
import User from "../models/user.model.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import * as shipmozoService from "../services/shipmozoService.js";
import { sendDispatchEmail } from "../services/emailService.js";

// Shipmozo raw current_status strings that indicate the courier has picked up the order.
// We normalize the raw string: trim + uppercase + replace spaces/hyphens with underscores.
const DISPATCHED_STATUSES = new Set([
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RTO_INITIATED",
  "RTO_DELIVERED",
  "PICKED_UP",
  "SHIPPED",
  "DISPATCHED",
]);

// Map normalized Shipmozo status strings → our ShipmentRecord enum values
const TRACKING_STATUS_MAP = {
  IN_TRANSIT:       "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED:        "DELIVERED",
  RTO_INITIATED:    "RTO_INITIATED",
  RTO_DELIVERED:    "RTO_DELIVERED",
  CANCELLED:        "CANCELLED",
  EXCEPTION:        "EXCEPTION",
  PICKED_UP:        "IN_TRANSIT",  // treat PICKED_UP as IN_TRANSIT in our enum
  SHIPPED:          "IN_TRANSIT",
  DISPATCHED:       "IN_TRANSIT",
};

// GET /admin/management/orders
// Returns paginated PAID orders from both Website + Instagram collections,
// merged and sorted newest-first. Enriches website orders with customer name.
const getPaidOrders = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const [webOrders, igOrders] = await Promise.all([
      Order.find(
        { status: "PAID" },
        { orderId: 1, userId: 1, createdAt: 1, items: 1, amount: 1, status: 1 },
      ).lean(),
      InstagramOrder.find(
        { status: "PAID" },
        { orderId: 1, customerName: 1, createdAt: 1, items: 1, amount: 1, status: 1 },
      ).lean(),
    ]);

    const userIds = [...new Set(webOrders.map((o) => o.userId).filter(Boolean))];
    const users =
      userIds.length > 0
        ? await User.find({ userId: { $in: userIds } }, { userId: 1, name: 1 }).lean()
        : [];
    const userMap = Object.fromEntries(users.map((u) => [u.userId, u.name]));

    const merged = [
      ...webOrders.map((o) => ({
        orderId:      o.orderId,
        customerName: userMap[o.userId] || `User ${(o.userId || "").slice(-6) || "?"}`,
        date:         o.createdAt,
        items:        o.items || [],
        amount:       o.amount ?? 0,
        status:       o.status,
        source:       "WEBSITE",
      })),
      ...igOrders.map((o) => ({
        orderId:      o.orderId,
        customerName: o.customerName,
        date:         o.createdAt,
        items:        o.items || [],
        amount:       o.amount ?? 0,
        status:       o.status,
        source:       "INSTAGRAM",
      })),
    ];

    merged.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total     = merged.length;
    const paginated = merged.slice((page - 1) * limit, page * limit);

    return res.status(200).json(
      new ApiResponse(200, "Management orders fetched.", {
        orders: paginated,
        pagination: {
          currentPage: page,
          totalPages:  Math.max(1, Math.ceil(total / limit)),
          total,
          limit,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
};

// GET /admin/management/fulfillment
// Returns two datasets for the Kanban fulfillment dashboard:
//   pendingFulfillment — PAID orders with no active ShipmentRecord (Table 1, oldest first)
//   activeShipments   — All non-cancelled ShipmentRecords enriched with customer names (Table 2)
const getFulfillmentData = async (req, res, next) => {
  try {
    // ── Table 1: PAID orders without any active (non-cancelled) shipment ─────
    const activeShipmentOrderIds = await ShipmentRecord.distinct("sourceOrderId", {
      isCancelled: { $ne: true },
    });

    const [webPending, igPending] = await Promise.all([
      Order.find(
        { status: "PAID", orderId: { $nin: activeShipmentOrderIds } },
        { orderId: 1, userId: 1, createdAt: 1, items: 1, amount: 1, isPriority: 1, prioritizedAt: 1 },
      ).sort({ createdAt: 1 }).lean(),
      InstagramOrder.find(
        { status: "PAID", orderId: { $nin: activeShipmentOrderIds } },
        { orderId: 1, customerName: 1, mobileNo: 1, createdAt: 1, orderedAt: 1, items: 1, amount: 1, isPriority: 1, prioritizedAt: 1 },
      ).sort({ createdAt: 1 }).lean(),
    ]);

    // Bulk-fetch user names for website pending orders
    const pendingUserIds = [...new Set(webPending.map((o) => o.userId).filter(Boolean))];
    const pendingUsers = pendingUserIds.length
      ? await User.find(
          { userId: { $in: pendingUserIds } },
          { userId: 1, name: 1, email: 1 },
        ).lean()
      : [];
    const pendingUserMap = Object.fromEntries(pendingUsers.map((u) => [u.userId, u]));

    const pendingFulfillment = [
      ...webPending.map((o) => ({
        orderId:       o.orderId,
        customerName:  pendingUserMap[o.userId]?.name || `User ${(o.userId || "").slice(-6)}`,
        date:          o.createdAt,
        items:         o.items || [],
        amount:        o.amount ?? 0,
        status:        "PAID",
        source:        "WEBSITE",
        isPriority:    !!o.isPriority,
        prioritizedAt: o.prioritizedAt ?? null,
      })),
      ...igPending.map((o) => ({
        orderId:       o.orderId,
        customerName:  o.customerName,
        date:          o.orderedAt || o.createdAt,
        items:         o.items || [],
        amount:        o.amount ?? 0,
        status:        "PAID",
        source:        "INSTAGRAM",
        isPriority:    !!o.isPriority,
        prioritizedAt: o.prioritizedAt ?? null,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date))  // OLDEST FIRST → FIFO
     .filter((o, idx, arr) => arr.findIndex((x) => x.orderId === o.orderId) === idx); // deduplicate

    // ── Table 2: All active (non-cancelled) ShipmentRecords ──────────────────
    const activeShipments = await ShipmentRecord.find(
      { isCancelled: { $ne: true } },
      {
        shipmentRefId:       1,
        sourceOrderId:       1,
        sourceOrderType:     1,
        shipmentStatus:      1,
        awbNumber:           1,
        courierCompany:      1,
        shipmozoOrderId:     1,
        dispatchConfirmedAt: 1,
        createdAt:           1,
      },
    ).sort({ createdAt: -1 }).lean();

    // Bulk-enrich shipments with customer names
    const webShipmentIds = activeShipments
      .filter((s) => s.sourceOrderType === "WEBSITE")
      .map((s) => s.sourceOrderId);
    const igShipmentIds = activeShipments
      .filter((s) => s.sourceOrderType === "INSTAGRAM")
      .map((s) => s.sourceOrderId);

    const [webShipmentOrders, igShipmentOrders] = await Promise.all([
      webShipmentIds.length
        ? Order.find({ orderId: { $in: webShipmentIds } }, { orderId: 1, userId: 1 }).lean()
        : Promise.resolve([]),
      igShipmentIds.length
        ? InstagramOrder.find(
            { orderId: { $in: igShipmentIds } },
            { orderId: 1, customerName: 1 },
          ).lean()
        : Promise.resolve([]),
    ]);

    const shipmentUserIds = [...new Set(webShipmentOrders.map((o) => o.userId).filter(Boolean))];
    const shipmentUsers = shipmentUserIds.length
      ? await User.find(
          { userId: { $in: shipmentUserIds } },
          { userId: 1, name: 1 },
        ).lean()
      : [];
    const shipmentUserMap  = Object.fromEntries(shipmentUsers.map((u) => [u.userId, u.name]));
    const webOrderToName   = Object.fromEntries(
      webShipmentOrders.map((o) => [
        o.orderId,
        shipmentUserMap[o.userId] || `User ${(o.userId || "").slice(-6)}`,
      ]),
    );
    const igOrderToName    = Object.fromEntries(
      igShipmentOrders.map((o) => [o.orderId, o.customerName]),
    );

    const enrichedShipments = activeShipments.map((s) => ({
      ...s,
      customerName:
        s.sourceOrderType === "WEBSITE"
          ? webOrderToName[s.sourceOrderId] || "—"
          : igOrderToName[s.sourceOrderId] || "—",
    }));

    return res.status(200).json(
      new ApiResponse(200, "Fulfillment data fetched.", {
        pendingFulfillment,
        activeShipments: enrichedShipments,
      }),
    );
  } catch (err) {
    next(err);
  }
};

// POST /admin/management/confirm-dispatch/:shipmentId
// Calls Shipmozo Track API to check if courier has picked up the order.
// If dispatched and not yet confirmed:
//   - Sets dispatchConfirmedAt (idempotency guard — write-once)
//   - Sends dispatch email to customer (website orders only; Instagram has no email)
const confirmDispatch = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;

    const record = await ShipmentRecord.findById(shipmentId);
    if (!record) throw new ApiError(404, "Shipment record not found.");

    // ── Idempotency: already confirmed ──────────────────────────────────────
    if (record.dispatchConfirmedAt) {
      return res.status(200).json(
        new ApiResponse(200, "Dispatch already confirmed.", {
          dispatched:          true,
          dispatchConfirmedAt: record.dispatchConfirmedAt,
          alreadyConfirmed:    true,
        }),
      );
    }

    // ── Need AWB to call track API ───────────────────────────────────────────
    if (!record.awbNumber) {
      return res.status(200).json(
        new ApiResponse(200, "No AWB assigned yet — courier not yet assigned.", {
          dispatched:    false,
          currentStatus: record.shipmentStatus,
          noAwb:         true,
        }),
      );
    }

    // ── Call Shipmozo Track API ──────────────────────────────────────────────
    const trackResult = await shipmozoService.trackOrder(record.awbNumber);
    const rawStatus   = trackResult?.data?.current_status || "";
    // Normalize e.g. "In Transit" → "IN_TRANSIT", "Out for Delivery" → "OUT_FOR_DELIVERY"
    const normalized  = rawStatus.trim().toUpperCase().replace(/[\s-]+/g, "_");
    const isDispatched = DISPATCHED_STATUSES.has(normalized);

    // Update our status field if Shipmozo returned a recognizable value
    if (TRACKING_STATUS_MAP[normalized]) {
      record.shipmentStatus = TRACKING_STATUS_MAP[normalized];
    }
    record.lastTrackedAt = new Date();

    if (!isDispatched) {
      await record.save();
      return res.status(200).json(
        new ApiResponse(200, "Not yet dispatched.", {
          dispatched:    false,
          currentStatus: rawStatus,
        }),
      );
    }

    // ── Mark dispatch confirmed (write-once idempotency field) ───────────────
    record.dispatchConfirmedAt = new Date();
    await record.save();

    // ── Email notification (non-fatal if it fails) ───────────────────────────
    let emailSent     = false;
    let noEmailReason = null;

    if (record.sourceOrderType === "WEBSITE") {
      try {
        const order = await Order.findOne(
          { orderId: record.sourceOrderId },
          { userId: 1 },
        ).lean();

        if (order) {
          const user = await User.findOne(
            { userId: order.userId },
            { name: 1, email: 1 },
          ).lean();

          if (user?.email) {
            await sendDispatchEmail({
              to:             user.email,
              customerName:   user.name || "Customer",
              orderId:        record.sourceOrderId,
              awbNumber:      record.awbNumber,
              courierCompany: record.courierCompany || "our courier partner",
            });
            emailSent = true;
          } else {
            noEmailReason = "No email address on user account";
            console.warn(`[confirmDispatch] No email for user of order ${record.sourceOrderId}`);
          }
        }
      } catch (emailErr) {
        noEmailReason = "Email delivery failed";
        console.error("[confirmDispatch] Email error:", emailErr.message);
      }
    } else {
      noEmailReason = "Instagram order — no email";
    }

    return res.status(200).json(
      new ApiResponse(200, "Dispatch confirmed.", {
        dispatched:          true,
        dispatchConfirmedAt: record.dispatchConfirmedAt,
        currentStatus:       rawStatus,
        emailSent,
        noEmailReason,
      }),
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/management/priority/:orderId?source=WEBSITE|INSTAGRAM
// Toggles the isPriority flag on the order so every admin sees the same state.
// Sets prioritizedAt on mark; clears it on unmark.
const togglePriority = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const source      = (req.query.source || "WEBSITE").toUpperCase();

    const Model = source === "INSTAGRAM" ? InstagramOrder : Order;
    const order = await Model.findOne({ orderId });
    if (!order) throw new ApiError(404, "Order not found.");

    order.isPriority    = !order.isPriority;
    order.prioritizedAt = order.isPriority ? new Date() : null;
    await order.save();

    return res.status(200).json(
      new ApiResponse(200, `Priority ${order.isPriority ? "set" : "cleared"}.`, {
        orderId,
        source,
        isPriority:    order.isPriority,
        prioritizedAt: order.prioritizedAt,
      }),
    );
  } catch (err) {
    next(err);
  }
};

export { getPaidOrders, getFulfillmentData, confirmDispatch, togglePriority };
