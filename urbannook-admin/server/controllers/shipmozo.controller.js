import ShipmentRecord from "../models/shipment.record.model.js";
import InstagramOrder from "../models/instagram.order.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import { parseAddress } from "../utils/addressParser.js";
import * as shipmozoService from "../services/shipmozoService.js";
import { sendDispatchEmail, sendInTransitEmail, sendDeliveredEmail } from "../services/emailService.js";

// Valid payment types accepted by Shipmozo
const ALLOWED_PAYMENT_TYPES = new Set(["PREPAID", "COD"]);

// Valid order source types
const ALLOWED_ORDER_TYPES = new Set(["WEBSITE", "INSTAGRAM"]);

// Statuses from which cancellation is not allowed
const NON_CANCELLABLE_STATUSES = new Set([
  "DELIVERED",
  "CANCELLED",
  "RTO_DELIVERED",
]);

// Map Shipmozo tracking status strings → our ShipmentRecord enum values.
// Shipmozo returns human-readable strings like "In Transit", "Delivered" etc.
// Keys are lowercased at lookup time (see normalizeTrackingStatus below).
const TRACKING_STATUS_MAP = {
  // ── Pre-pickup ────────────────────────────────────────────────────────────
  "data received":            "PUSHED",
  "pickup pending":           "PUSHED",
  "out for pickup":           "PICKUP_SCHEDULED",
  "scheduled":                "PICKUP_SCHEDULED",
  "pickup scheduled":         "PICKUP_SCHEDULED",
  "assigned":                 "ASSIGNED",

  // ── Pickup done / in motion ───────────────────────────────────────────────
  "pickdone":                 "IN_TRANSIT",   // XpressBees: "PickDone"
  "pickup done":              "IN_TRANSIT",
  "pickup completed":         "IN_TRANSIT",
  "picked":                   "IN_TRANSIT",   // XpressBees: "Picked"
  "in transit":               "IN_TRANSIT",
  "intransit":                "IN_TRANSIT",   // XpressBees: "InTransit"
  "shipped":                  "IN_TRANSIT",

  // ── Last-mile ─────────────────────────────────────────────────────────────
  "at delivery center":       "OUT_FOR_DELIVERY",   // XpressBees current_status
  "reached at destination":   "OUT_FOR_DELIVERY",   // XpressBees scan_detail
  "out for delivery":         "OUT_FOR_DELIVERY",
  "with delivery boy":        "OUT_FOR_DELIVERY",

  // ── Terminal ──────────────────────────────────────────────────────────────
  "delivered":                "DELIVERED",
  "cancelled":                "CANCELLED",
  "cancel":                   "CANCELLED",
  "rto initiated":            "RTO_INITIATED",
  "return initiated":         "RTO_INITIATED",
  "rto in transit":           "RTO_INITIATED",
  "rto delivered":            "RTO_DELIVERED",
  "exception":                "EXCEPTION",
  "lost":                     "EXCEPTION",
  "damaged":                  "EXCEPTION",

  // ── Backward-compat uppercase (assign-courier / schedule-pickup responses) ─
  "IN_TRANSIT":               "IN_TRANSIT",
  "OUT_FOR_DELIVERY":         "OUT_FOR_DELIVERY",
  "DELIVERED":                "DELIVERED",
  "RTO_INITIATED":            "RTO_INITIATED",
  "RTO_DELIVERED":            "RTO_DELIVERED",
  "CANCELLED":                "CANCELLED",
  "EXCEPTION":                "EXCEPTION",
};

/**
 * Normalize a raw Shipmozo status string to our enum value.
 * Tries exact match first, then lowercase lookup.
 */
export function normalizeTrackingStatus(raw) {
  if (!raw) return null;
  return TRACKING_STATUS_MAP[raw] ?? TRACKING_STATUS_MAP[raw.toLowerCase()] ?? null;
}

// ── Email helpers (all non-fatal — log and move on) ──────────────────────────
//
// Stage 1 — AWB received → sendDispatchEmail
//   Guard: record.awbNumber exists && dispatchConfirmedAt is null && WEBSITE
//   Called from: syncStatusForShipment (when AWB is set), syncAllStatuses
//
// Stage 2 — Status → IN_TRANSIT → sendInTransitEmail
//   Guard: shipmentStatus === "IN_TRANSIT" && transitEmailSentAt is null && WEBSITE
//   Called from: both sync functions
//
// Stage 3 — Status → DELIVERED → sendDeliveredEmail
//   Guard: shipmentStatus === "DELIVERED" && deliveredEmailSentAt is null && WEBSITE
//   Called from: both sync functions

export async function maybeFireDispatchEmail(record) {
  const tag = `[Email:Dispatch][${record.sourceOrderId}]`;

  if (!record.awbNumber) return;
  if (record.dispatchConfirmedAt) return;
  if (record.sourceOrderType !== "WEBSITE") return;

  // Atomic DB claim — only one caller wins; concurrent cron runs see modifiedCount 0
  const claimed = await ShipmentRecord.updateOne(
    { _id: record._id, dispatchConfirmedAt: null },
    { $set: { dispatchConfirmedAt: new Date() } },
  );
  if (claimed.modifiedCount === 0) return;

  console.log(`${tag} Claimed — sending email…`);
  const rollback = () => ShipmentRecord.updateOne({ _id: record._id }, { $set: { dispatchConfirmedAt: null } });
  try {
    const order = await Order.findOne(
      { orderId: record.sourceOrderId },
      { userId: 1, items: 1, amount: 1, "deliveryAddress.formattedAddress": 1 },
    ).lean();
    if (!order) { await rollback(); console.warn(`${tag} ⚠️ Order not found — guard rolled back`); return; }

    const user = await User.findOne({ userId: order.userId }, { name: 1, email: 1, mobileNumber: 1 }).lean();
    if (!user?.email) { await rollback(); console.warn(`${tag} ⚠️ No email on user — guard rolled back`); return; }

    await sendDispatchEmail({
      to:              user.email,
      customerName:    user.name || "Valued Customer",
      orderId:         record.sourceOrderId,
      awbNumber:       record.awbNumber,
      courierCompany:  record.courierCompany,
      items:           order.items || [],
      amount:          order.amount || 0,
      deliveryAddress: order.deliveryAddress?.formattedAddress || "",
      mobileNumber:    user.mobileNumber ? String(user.mobileNumber) : "",
    });
    console.log(`${tag} ✅ Sent`);
  } catch (err) {
    await rollback();
    console.error(`${tag} ❌ Failed, guard rolled back for retry:`, err.message);
  }
}

export async function maybeFireTransitEmail(record) {
  const tag = `[Email:Transit][${record.sourceOrderId}]`;

  if (record.shipmentStatus !== "IN_TRANSIT") return;
  if (record.transitEmailSentAt) return;
  if (record.sourceOrderType !== "WEBSITE") return;

  const claimed = await ShipmentRecord.updateOne(
    { _id: record._id, transitEmailSentAt: null },
    { $set: { transitEmailSentAt: new Date() } },
  );
  if (claimed.modifiedCount === 0) return;

  console.log(`${tag} Claimed — sending email…`);
  const rollback = () => ShipmentRecord.updateOne({ _id: record._id }, { $set: { transitEmailSentAt: null } });
  try {
    const order = await Order.findOne(
      { orderId: record.sourceOrderId },
      { userId: 1, items: 1, amount: 1, "deliveryAddress.formattedAddress": 1 },
    ).lean();
    if (!order) { await rollback(); console.warn(`${tag} ⚠️ Order not found — guard rolled back`); return; }

    const user = await User.findOne({ userId: order.userId }, { name: 1, email: 1, mobileNumber: 1 }).lean();
    if (!user?.email) { await rollback(); console.warn(`${tag} ⚠️ No email on user — guard rolled back`); return; }

    await sendInTransitEmail({
      to:              user.email,
      customerName:    user.name || "Valued Customer",
      orderId:         record.sourceOrderId,
      awbNumber:       record.awbNumber,
      courierCompany:  record.courierCompany,
      items:           order.items || [],
      amount:          order.amount || 0,
      deliveryAddress: order.deliveryAddress?.formattedAddress || "",
      mobileNumber:    user.mobileNumber ? String(user.mobileNumber) : "",
    });
    console.log(`${tag} ✅ Sent`);
  } catch (err) {
    await rollback();
    console.error(`${tag} ❌ Failed, guard rolled back for retry:`, err.message);
  }
}

export async function maybeFireDeliveredEmail(record) {
  const tag = `[Email:Delivered][${record.sourceOrderId}]`;

  if (record.shipmentStatus !== "DELIVERED") return;
  if (record.deliveredEmailSentAt) return;
  if (record.sourceOrderType !== "WEBSITE") return;

  const claimed = await ShipmentRecord.updateOne(
    { _id: record._id, deliveredEmailSentAt: null },
    { $set: { deliveredEmailSentAt: new Date() } },
  );
  if (claimed.modifiedCount === 0) return;

  console.log(`${tag} Claimed — sending email…`);
  const rollback = () => ShipmentRecord.updateOne({ _id: record._id }, { $set: { deliveredEmailSentAt: null } });
  try {
    const order = await Order.findOne(
      { orderId: record.sourceOrderId },
      { userId: 1, items: 1, amount: 1, "deliveryAddress.formattedAddress": 1 },
    ).lean();
    if (!order) { await rollback(); console.warn(`${tag} ⚠️ Order not found — guard rolled back`); return; }

    const user = await User.findOne({ userId: order.userId }, { name: 1, email: 1, mobileNumber: 1 }).lean();
    if (!user?.email) { await rollback(); console.warn(`${tag} ⚠️ No email on user — guard rolled back`); return; }

    await sendDeliveredEmail({
      to:              user.email,
      customerName:    user.name || "Valued Customer",
      orderId:         record.sourceOrderId,
      awbNumber:       record.awbNumber,
      courierCompany:  record.courierCompany,
      items:           order.items || [],
      amount:          order.amount || 0,
      deliveryAddress: order.deliveryAddress?.formattedAddress || "",
      mobileNumber:    user.mobileNumber ? String(user.mobileNumber) : "",
    });
    console.log(`${tag} ✅ Sent`);
  } catch (err) {
    await rollback();
    console.error(`${tag} ❌ Failed, guard rolled back for retry:`, err.message);
  }
}

/**
 * Basic AWB sanity check — rejects obvious test/junk values before they touch the DB.
 * Rules:
 *  - Must be 8–30 alphanumeric characters (no spaces / special chars)
 *  - Must not be a pure sequential run like "12345678" or "1234567812345"
 *  - Must not be all the same digit repeated ("00000000", "11111111")
 */
export function isValidAwb(awb) {
  if (!awb || typeof awb !== "string") return false;
  const clean = awb.trim();
  if (!/^[A-Za-z0-9]{8,30}$/.test(clean)) return false;       // length + alphanumeric
  if (/^(0123456789|1234567890|12345678901234|123456789012345)/.test(clean)) return false; // ascending run
  if (/^(.)\1{6,}$/.test(clean)) return false;                 // all same char ("0000000")
  return true;
}

/**
 * Write AWB number and carrier back to the source Order or InstagramOrder.
 * Called any time record.awbNumber is newly populated.
 * Non-fatal — failure is logged but does not abort the calling operation.
 */
export async function writeTrackingToSourceOrder(record) {
  console.log(`[Tracking] called — AWB: "${record.awbNumber}" | type: ${record.sourceOrderType} | order: ${record.sourceOrderId}`);
  if (!record.awbNumber) {
    console.warn(`[Tracking] Skipped — no AWB on record.`);
    return;
  }
  // Reject junk/test values regardless of how they got into the record
  if (!isValidAwb(record.awbNumber)) {
    console.warn(`[Tracking] Skipped — AWB "${record.awbNumber}" failed validation.`);
    return;
  }
  const update = {
    $set: {
      "trackingInfo.trackingNumber": record.awbNumber,
      "trackingInfo.carrier":        record.courierCompany || null,
      "trackingInfo.updatedAt":      new Date(),
    },
  };
  try {
    let result;
    if (record.sourceOrderType === "WEBSITE") {
      result = await Order.updateOne({ orderId: record.sourceOrderId }, update);
    } else {
      result = await InstagramOrder.updateOne({ orderId: record.sourceOrderId }, update);
    }
    console.log(
      `[Tracking] Writing AWB "${record.awbNumber}" to ${record.sourceOrderType} order "${record.sourceOrderId}"`,
    );
    console.log(
      `[Tracking] Result → matched: ${result.matchedCount} | modified: ${result.modifiedCount}`,
    );
    if (result.matchedCount === 0) {
      console.warn(`[Tracking] ❌ Order "${record.sourceOrderId}" NOT FOUND in DB — trackingInfo not written.`);
    } else if (result.modifiedCount === 0) {
      console.warn(`[Tracking] ⚠️ Order found but not modified — trackingInfo may already be up to date.`);
    } else {
      console.log(`[Tracking] ✅ trackingInfo updated successfully.`);
    }
  } catch (err) {
    console.error("[Tracking] ❌ Failed to write trackingInfo to source order:", err.message);
  }
}

// POST /admin/shipmozo/push-order
// Pushes a website or Instagram order to Shipmozo as a new shipment.
// Customer name/address are auto-mapped from the DB — zero manual typing.
const pushOrderToCourier = async (req, res, next) => {
  try {
    const {
      orderId,
      orderType,
      warehouseId,
      paymentType,
      weight,
      length,
      width,
      height,
    } = req.body;

    // ── 1. Validate all 8 required fields ─────────────────────────────────────
    const errors = [];

    if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
      errors.push("orderId is required.");
    }
    if (!orderType || !ALLOWED_ORDER_TYPES.has(orderType)) {
      errors.push(
        `orderType must be one of: ${[...ALLOWED_ORDER_TYPES].join(", ")}.`,
      );
    }
    if (
      !warehouseId ||
      typeof warehouseId !== "string" ||
      !warehouseId.trim()
    ) {
      errors.push("warehouseId is required.");
    }
    if (!paymentType || !ALLOWED_PAYMENT_TYPES.has(paymentType)) {
      errors.push(
        `paymentType must be one of: ${[...ALLOWED_PAYMENT_TYPES].join(", ")}.`,
      );
    }

    const numWeight = Number(weight);
    const numLength = Number(length);
    const numWidth = Number(width);
    const numHeight = Number(height);

    if (!Number.isFinite(numWeight) || numWeight <= 0)
      errors.push("weight must be a positive number (grams).");
    if (!Number.isFinite(numLength) || numLength <= 0)
      errors.push("length must be a positive number (cm).");
    if (!Number.isFinite(numWidth) || numWidth <= 0)
      errors.push("width must be a positive number (cm).");
    if (!Number.isFinite(numHeight) || numHeight <= 0)
      errors.push("height must be a positive number (cm).");

    if (errors.length > 0) {
      throw new ApiError(400, errors.join(" "));
    }

    const cleanOrderId = orderId.trim();

    // ── 2. Duplicate check — block if an active (non-cancelled) shipment exists.
    // Query for non-cancelled records directly so the check is deterministic
    // even when multiple records exist for the same order (e.g. after cancel + re-push).
    const existing = await ShipmentRecord.findOne({
      sourceOrderId: cleanOrderId,
      isCancelled: { $ne: true },
    });
    if (existing) {
      throw new ApiError(400, "Shipment already exists for this order.");
    }

    // ── 3. Fetch source order ──
    let order;
    if (orderType === "INSTAGRAM") {
      order = await InstagramOrder.findOne({ orderId: cleanOrderId }).lean();
    } else {
      order = await Order.findOne({ orderId: cleanOrderId }).lean();
    }

    if (!order) {
      throw new ApiError(404, `Order "${cleanOrderId}" not found.`);
    }

    // ── 4. Build customer data ─
    let consigneeName, consigneePhone, rawAddress;

    if (orderType === "INSTAGRAM") {
      consigneeName = order.customerName;
      // Strip non-digits, then take last 10 digits to drop country code (91/+91)
      const rawDigits = order.contactNumber.replace(/\D/g, "");
      consigneePhone = parseInt(rawDigits.slice(-10), 10);
      rawAddress = order.deliveryAddress;
    } else {
      // WEBSITE: look up customer name and mobile from the User collection (read-only)
      const user = await User.findOne(
        { userId: order.userId },
        { name: 1, mobileNumber: 1 },
      ).lean();
      if (!user) {
        throw new ApiError(
          404,
          `User not found for order "${cleanOrderId}". Cannot build consignee details.`,
        );
      }
      if (!user.name) {
        throw new ApiError(
          400,
          `User "${order.userId}" has no name on record.`,
        );
      }
      if (!user.mobileNumber) {
        throw new ApiError(
          400,
          `User "${order.userId}" has no mobile number on record.`,
        );
      }
      consigneeName = user.name;
      // mobileNumber is stored as Number in prod — convert to string, strip non-digits, take last 10
      const rawDigits = String(user.mobileNumber).replace(/\D/g, "");
      consigneePhone = parseInt(rawDigits.slice(-10), 10);
      rawAddress = order.deliveryAddress?.formattedAddress || "";
    }

    // ── 5. Parse address string
    const parsed = parseAddress(rawAddress);
    if (!parsed.parseSuccess) {
      throw new ApiError(
        400,
        "Cannot parse delivery address: pincode not found. Please update the address before creating a shipment.",
      );
    }

    // ── 5b. Resolve warehouse pincode for Rate Calculator (non-fatal) ─────────
    let pickupPincode = null;
    try {
      const warehouseData = await shipmozoService.getWarehouses();
      const warehouses = warehouseData?.data ?? warehouseData ?? [];
      const match = Array.isArray(warehouses)
        ? warehouses.find(
            (w) =>
              String(w.id ?? w.warehouse_id ?? "").trim() ===
              warehouseId.trim(),
          )
        : null;
      if (match) {
        pickupPincode =
          String(
            match.pincode ?? match.zip ?? match.postal_code ?? "",
          ).trim() || null;
      }
    } catch {
      console.warn(
        "[Shipmozo] Could not resolve warehouse pincode — pickupPincode will be null",
      );
    }

    // ── 6. Build product_detail array ────────────────────────────────────────
    const productDetail = (order.items || []).map((item) => ({
      name: item.productSnapshot?.productName || "Product",
      sku_number: "",
      quantity: item.productSnapshot?.quantity || 1,
      unit_price: item.productSnapshot?.priceAtPurchase || 0,
      discount: "",
      product_category: item.productSnapshot?.productCategory || "Other",
    }));

    // ── 7. Build Shipmozo payload ─────────────────────────────────────────────
    // For Instagram orders use orderedAt (when the customer actually placed it).
    // For website orders createdAt is the order date (payment creates the record).
    const rawOrderDate =
      orderType === "INSTAGRAM" ? (order.orderedAt || order.createdAt) : order.createdAt;
    const orderDate = new Date(rawOrderDate).toISOString().split("T")[0];

    // For website orders the orderId is a UUID — shorten to WS-{last-segment}
    // so it appears clean in Shipmozo's dashboard (mirrors IG-0016 style).
    // e.g. "019cf323-0e87-736e-89f4-5cd9004b6a23" → "WS-5cd9004b6a23"
    // sourceOrderId in our DB stays as the full UUID for internal lookups.
    const shipmozoOrderRef = orderType === "INSTAGRAM"
      ? cleanOrderId
      : `WS-${cleanOrderId.split("-").pop()}`;

    const shipmozoPayload = {
      order_id: shipmozoOrderRef,
      order_date: orderDate,
      consignee_name: consigneeName,
      consignee_phone: consigneePhone,
      consignee_address_line_one: parsed.addressLine1,
      consignee_pin_code: parseInt(parsed.pincode, 10),
      consignee_city: parsed.city,
      consignee_state: parsed.state,
      product_detail: productDetail,
      payment_type: paymentType,
      weight: numWeight,
      length: numLength,
      width: numWidth,
      height: numHeight,
      warehouse_id: warehouseId.trim(),
    };

    // ── 8. Push to Shipmozo ────
    console.log(
      "[Shipmozo] Target URL:",
      `${process.env.SHIPMOZO_BASE_URL}/push-order`,
    );
    console.log(
      "[Shipmozo] Pushing order payload:",
      JSON.stringify(shipmozoPayload, null, 2),
    );
    const shipmozoResponse = await shipmozoService.pushOrder(shipmozoPayload);
    console.log(
      "[Shipmozo] Success response:",
      JSON.stringify(shipmozoResponse, null, 2),
    );

    // Shipmozo generates its own order_id (e.g. "48321AP367463468983") — stored as
    // shipmozoOrderId and used for ALL subsequent API calls (assign, rate, cancel).
    // They echo back what we sent as refrence_id (their typo) — stored as shipmozoRefId.
    const shipmozoGeneratedId =
      shipmozoResponse?.data?.order_id ??
      shipmozoResponse?.order_id ??
      null;
    const shipmozoRefId =
      shipmozoResponse?.data?.refrence_id ??
      shipmozoResponse?.data?.reference_id ??
      null;
    if (!shipmozoGeneratedId) {
      console.warn(
        "[Shipmozo] push-order response did not include order_id — shipmozoOrderId will be null. Full response:",
        JSON.stringify(shipmozoResponse),
      );
    }

    // ── 9. Persist shipment record ────────────────────────────────────────────
    const record = await ShipmentRecord.create({
      sourceOrderId: cleanOrderId,
      sourceOrderType: orderType,
      shipmozoOrderId: shipmozoGeneratedId,
      shipmozoRefId,
      warehouseId: warehouseId.trim(),
      paymentType,
      weight: numWeight,
      length: numLength,
      width: numWidth,
      height: numHeight,
      shipmentStatus: "PUSHED",
      deliveryPincode: parsed.pincode,
      pickupPincode,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Shipment created successfully.", record));
  } catch (err) {
    next(err);
  }
};

// GET /admin/shipmozo/shipment/:orderId
// Returns the ShipmentRecord for an order, or null if none exists.
// Always responds 200 — frontend uses data === null to determine button state.
const getShipmentByOrderId = async (req, res, next) => {
  try {
    // Return the most recent record — after cancel + re-push there can be multiple.
    // Sorting by createdAt desc ensures we always get the latest one.
    const record = await ShipmentRecord.findOne({ sourceOrderId: req.params.orderId })
      .sort({ createdAt: -1 })
      .lean();

    return res
      .status(200)
      .json(new ApiResponse(200, "Shipment record fetched.", record));
  } catch (err) {
    next(err);
  }
};

// GET /admin/shipmozo/warehouses
// Returns the warehouse list from Shipmozo.
// Frontend pre-selects the one matching SHIPMOZO_DEFAULT_WAREHOUSE_ID.
const listWarehouses = async (_req, res, next) => {
  try {
    const data = await shipmozoService.getWarehouses();
    return res
      .status(200)
      .json(new ApiResponse(200, "Warehouses fetched.", data));
  } catch (err) {
    next(err);
  }
};

// GET /admin/shipmozo/shipments
// Paginated list of all ShipmentRecords, enriched with source order data via $lookup.
// Query params: status (comma-separated), page, limit
const listShipments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    // Build status match — supports single value or comma-separated for tab groups
    const matchStage = {};
    if (req.query.status) {
      const statuses = req.query.status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        matchStage.shipmentStatus = statuses[0];
      } else if (statuses.length > 1) {
        matchStage.shipmentStatus = { $in: statuses };
      }
    }

    const [records, totalCount] = await Promise.all([
      ShipmentRecord.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Enrich with website order data
        {
          $lookup: {
            from: "orders",
            localField: "sourceOrderId",
            foreignField: "orderId",
            as: "_webOrder",
          },
        },
        // Enrich with instagram order data
        {
          $lookup: {
            from: "instagramorders",
            localField: "sourceOrderId",
            foreignField: "orderId",
            as: "_igOrder",
          },
        },
        // Merge into a single _sourceOrder field based on type
        {
          $addFields: {
            _sourceOrder: {
              $cond: {
                if: { $eq: ["$sourceOrderType", "INSTAGRAM"] },
                then: { $arrayElemAt: ["$_igOrder", 0] },
                else: { $arrayElemAt: ["$_webOrder", 0] },
              },
            },
          },
        },
        // Drop the raw lookup arrays + heavy fields not needed in list view
        {
          $project: {
            _webOrder: 0,
            _igOrder: 0,
            labelBase64: 0,
            trackingHistory: 0,
          },
        },
      ]),
      ShipmentRecord.countDocuments(matchStage),
    ]);

    return res.status(200).json(
      new ApiResponse(200, "Shipments fetched.", {
        shipments: records,
        pagination: {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
          totalRecords: totalCount,
          limit,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
};

// GET /admin/shipmozo/shipments/:id/rates
// Fetches courier rate options from Shipmozo for a given ShipmentRecord.
// Requires deliveryPincode and pickupPincode to have been captured at push time.
const getRatesForShipment = async (req, res, next) => {
  try {
    const record = await ShipmentRecord.findById(req.params.id).lean();
    if (!record) throw new ApiError(404, "Shipment record not found.");

    if (!record.deliveryPincode) {
      throw new ApiError(
        400,
        "Delivery pincode not stored for this shipment. Please cancel and re-push the order from the Orders page.",
      );
    }
    if (!record.pickupPincode) {
      throw new ApiError(
        400,
        "Pickup (warehouse) pincode not stored for this shipment. Please cancel and re-push the order from the Orders page.",
      );
    }

    // Fetch order amount for the rate calculator
    let orderAmount = 0;
    try {
      const sourceOrder =
        record.sourceOrderType === "INSTAGRAM"
          ? await InstagramOrder.findOne(
              { orderId: record.sourceOrderId },
              { amount: 1 },
            ).lean()
          : await Order.findOne(
              { orderId: record.sourceOrderId },
              { amount: 1 },
            ).lean();
      orderAmount = sourceOrder?.amount ?? 0;
    } catch {
      // Non-fatal — proceed with 0
    }

    if (!record.shipmozoOrderId) {
      throw new ApiError(
        400,
        "Shipmozo order ID not found for this shipment. The push may not have completed successfully.",
      );
    }

    const ratePayload = {
      order_id: record.shipmozoOrderId,
      pickup_pincode: parseInt(record.pickupPincode, 10),
      delivery_pincode: parseInt(record.deliveryPincode, 10),
      payment_type: record.paymentType,
      shipment_type: "FORWARD",
      order_amount: orderAmount,
      type_of_package: "SPS",
      rov_type: "ROV_OWNER",
      cod_amount: record.paymentType === "COD" ? String(orderAmount) : "",
      weight: record.weight,
      dimensions: [
        {
          no_of_box: "1",
          length: String(record.length),
          width: String(record.width),
          height: String(record.height),
        },
      ],
    };

    const data = await shipmozoService.getRates(ratePayload);
    return res.status(200).json(new ApiResponse(200, "Rates fetched.", data));
  } catch (err) {
    next(err);
  }
};

// POST /admin/shipmozo/shipments/:id/assign
// Assigns a specific courier to a PUSHED shipment.
// Body: { courierId } — numeric courier_id from Rate Calculator response
const assignCourierToShipment = async (req, res, next) => {
  try {
    const { courierId } = req.body;
    if (!courierId || !Number.isFinite(Number(courierId))) {
      throw new ApiError(400, "courierId is required and must be a number.");
    }

    const record = await ShipmentRecord.findById(req.params.id);
    if (!record) throw new ApiError(404, "Shipment record not found.");
    if (record.shipmentStatus !== "PUSHED") {
      throw new ApiError(
        400,
        `Cannot assign courier — shipment is already in ${record.shipmentStatus} status.`,
      );
    }

    if (!record.shipmozoOrderId) {
      throw new ApiError(
        400,
        "Shipmozo order ID not found for this shipment. The push may not have completed successfully.",
      );
    }

    const result = await shipmozoService.assignCourier({
      order_id: record.shipmozoOrderId,
      courier_id: Number(courierId),
    });

    // result.data: { order_id, reference_id, courier, awb_number? }
    // Normalize courier name — Shipmozo may return string or object
    const courierName =
      typeof result.data?.courier === "string"
        ? result.data.courier
        : (result.data?.courier?.name ?? null);

    record.shipmentStatus = "ASSIGNED";
    record.courierCompany = courierName;

    // Prefer awb_number from assign response; fall back to reference_id
    const awbFromAssignRaw =
      result.data?.awb_number ?? result.data?.reference_id ?? null;
    const awbFromAssign = isValidAwb(String(awbFromAssignRaw ?? "")) ? String(awbFromAssignRaw) : null;
    if (awbFromAssign && !record.awbNumber) {
      record.awbNumber = awbFromAssign;
    }

    // For couriers that don't auto-schedule pickup, call schedulePickup to obtain AWB
    if (!record.awbNumber) {
      try {
        const pickupResult = await shipmozoService.schedulePickup(
          record.shipmozoOrderId,
        );
        const awbFromPickupRaw =
          pickupResult?.data?.awb_number ??
          pickupResult?.data?.reference_id ??
          null;
        const awbFromPickup = isValidAwb(String(awbFromPickupRaw ?? "")) ? String(awbFromPickupRaw) : null;
        if (awbFromPickup) {
          record.awbNumber = awbFromPickup;
          record.shipmentStatus = "PICKUP_SCHEDULED";
        }
      } catch (pickupErr) {
        // Non-fatal — AWB may arrive later via tracking webhook
        console.warn(
          "[Shipmozo] schedulePickup failed (non-fatal):",
          pickupErr?.message,
        );
      }
    }

    await record.save();

    // Write AWB to source order tracking field (non-fatal)
    await writeTrackingToSourceOrder(record);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Courier assigned successfully.",
          record.toObject(),
        ),
      );
  } catch (err) {
    next(err);
  }
};

// GET /admin/shipmozo/shipments/:id/label
// Fetches and caches the shipping label (base64 PNG) for a shipment with an AWB.
const getLabelForShipment = async (req, res, next) => {
  try {
    const record = await ShipmentRecord.findById(req.params.id).lean();
    if (!record) throw new ApiError(404, "Shipment record not found.");
    if (!record.awbNumber) {
      throw new ApiError(
        400,
        "No AWB number — courier has not been assigned yet.",
      );
    }

    // Return cached label without hitting Shipmozo again
    if (record.labelBase64) {
      return res.status(200).json(
        new ApiResponse(200, "Label fetched (cached).", {
          label: record.labelBase64,
        }),
      );
    }

    const data = await shipmozoService.getLabel(record.awbNumber);
    const labelEntry = Array.isArray(data?.data) ? data.data[0] : null;
    const labelBase64 = labelEntry?.label ?? null;

    if (labelBase64) {
      // Cache so future calls skip the Shipmozo round-trip
      await ShipmentRecord.findByIdAndUpdate(record._id, { labelBase64 });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Label fetched.", { label: labelBase64 }));
  } catch (err) {
    next(err);
  }
};

// GET /admin/shipmozo/shipments/:id/track
// Fetches live tracking data and optionally syncs shipmentStatus.
const trackShipment = async (req, res, next) => {
  try {
    // Use mutable doc so maybeFireTransitEmail can save transitEmailSentAt
    const record = await ShipmentRecord.findById(req.params.id);
    if (!record) throw new ApiError(404, "Shipment record not found.");
    if (!record.awbNumber) {
      throw new ApiError(
        400,
        "No AWB number to track — courier has not been assigned yet.",
      );
    }

    const result = await shipmozoService.trackOrder(record.awbNumber);
    // track-order data can be an object or array — normalize
    const rawData = result?.data;
    const trackData = Array.isArray(rawData) ? rawData[0] : (rawData ?? result);

    // Sync status and dates back to our record
    const updateFields = { lastTrackedAt: new Date() };

    const normalizedStatus = normalizeTrackingStatus(trackData?.current_status);
    if (normalizedStatus) {
      updateFields.shipmentStatus = normalizedStatus;
    }
    if (trackData?.expected_delivery_date) {
      const parsed = new Date(trackData.expected_delivery_date);
      if (!isNaN(parsed.getTime())) updateFields.expectedDeliveryDate = parsed;
    }

    // Apply updates to the doc so maybeFireTransitEmail sees the new status
    Object.assign(record, updateFields);
    await record.save();

    // Ensure trackingInfo is written to source order (idempotent — no-op if already set)
    await writeTrackingToSourceOrder(record);

    // Fire IN_TRANSIT email if newly transitioned (idempotent)
    await maybeFireTransitEmail(record);

    // Include normalizedStatus so the frontend can update the row badge correctly
    // without mapping raw Shipmozo strings ("Pickup Pending" etc.) itself.
    return res
      .status(200)
      .json(new ApiResponse(200, "Tracking data fetched.", {
        ...trackData,
        _normalizedStatus: normalizedStatus ?? null,
      }));
  } catch (err) {
    next(err);
  }
};

// POST /admin/shipmozo/shipments/:id/cancel
// Cancels a shipment on Shipmozo and marks it cancelled in our DB.
const cancelShipment = async (req, res, next) => {
  try {
    const record = await ShipmentRecord.findById(req.params.id);
    if (!record) throw new ApiError(404, "Shipment record not found.");

    if (NON_CANCELLABLE_STATUSES.has(record.shipmentStatus)) {
      throw new ApiError(
        400,
        `Cannot cancel a shipment in ${record.shipmentStatus} status.`,
      );
    }
    if (record.isCancelled) {
      throw new ApiError(400, "Shipment is already cancelled.");
    }

    // If we never captured Shipmozo's generated order ID, skip the API call —
    // there's nothing registered on their side (or we can't identify the order).
    // Just mark it cancelled locally so it stops appearing as active.
    if (record.shipmozoOrderId) {
      // Only include awb_number when we have a real one — sending 0 causes
      // Shipmozo to return result:"1" without actually cancelling the order.
      const cancelPayload = { order_id: record.shipmozoOrderId };
      if (record.awbNumber) {
        const awbNum = parseInt(record.awbNumber, 10);
        if (!isNaN(awbNum)) cancelPayload.awb_number = awbNum;
      }

      const cancelResult = await shipmozoService.cancelOrder(cancelPayload);
      console.log(`[Shipmozo] cancelShipment API response for ${record.shipmozoOrderId}:`, JSON.stringify(cancelResult));
    } else {
      console.warn(
        `[Shipmozo] cancelShipment: no shipmozoOrderId for record ${record._id} — cancelling locally only.`,
      );
    }

    record.shipmentStatus = "CANCELLED";
    record.isCancelled = true;
    await record.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Shipment cancelled.", record.toObject()));
  } catch (err) {
    next(err);
  }
};

// GET /admin/shipmozo/shipped-order-ids
// Returns a plain array of sourceOrderId strings for all non-cancelled ShipmentRecords.
// Used by the Orders table to show the "Shipped" button state and shipment filter
// without N+1 API calls per row.
const getShippedOrderIds = async (_req, res, next) => {
  try {
    const records = await ShipmentRecord.find(
      { isCancelled: { $ne: true } },
      { sourceOrderId: 1, _id: 0 },
    ).lean();
    const ids = records.map((r) => r.sourceOrderId);
    return res
      .status(200)
      .json(new ApiResponse(200, "Shipped order IDs fetched.", ids));
  } catch (err) {
    next(err);
  }
};

// POST /admin/shipmozo/shipments/sync-statuses
// Batch-tracks all active shipments (those with an AWB that are not in a terminal state)
// and writes the updated status back to our DB. Returns counts of synced/error records.
export const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED", "RTO_DELIVERED"]);

const syncAllStatuses = async (_req, res, next) => {
  try {
    // Fetch mutable docs so maybeFireTransitEmail can save fields
    const activeRecords = await ShipmentRecord.find({
      isCancelled: { $ne: true },
      awbNumber:   { $ne: null },
      shipmentStatus: { $nin: [...TERMINAL_STATUSES] },
    });

    const results = { synced: 0, updated: 0, errors: 0 };

    await Promise.allSettled(
      activeRecords.map(async (record) => {
        try {
          const result    = await shipmozoService.trackOrder(record.awbNumber);
          const trackData = result?.data ?? result;

          const mapped = normalizeTrackingStatus(trackData?.current_status);
          if (mapped && mapped !== record.shipmentStatus) {
            record.shipmentStatus = mapped;
            if (mapped === "CANCELLED") record.isCancelled = true;
            results.updated++;
          }

          record.lastTrackedAt = new Date();
          await record.save();

          // Ensure trackingInfo is written to source order (idempotent — no-op if already set)
          await writeTrackingToSourceOrder(record);

          // Fire stage emails (all idempotent via their respective sentAt guards)
          await maybeFireDispatchEmail(record);  // Stage 1: AWB received
          await maybeFireTransitEmail(record);   // Stage 2: IN_TRANSIT
          await maybeFireDeliveredEmail(record); // Stage 3: DELIVERED

          results.synced++;
        } catch (err) {
          console.error(`[syncAllStatuses] Error on record ${record._id}:`, err.message);
          results.errors++;
        }
      }),
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Status sync complete.", results));
  } catch (err) {
    next(err);
  }
};

// POST /admin/shipmozo/shipments/:id/sync
// Pulls the latest order detail from Shipmozo (AWB, courier, status) and writes it back.
// Use this for rows where the courier was assigned on the Shipmozo website (not via our API),
// meaning awbNumber is still null locally. If Shipmozo says the order doesn't exist, marks
// the record as cancelled (handles the "deleted from Shipmozo website" bug).
const syncStatusForShipment = async (req, res, next) => {
  try {
    const record = await ShipmentRecord.findById(req.params.id);
    if (!record) throw new ApiError(404, "Shipment record not found.");

    console.log(`[Sync] id: ${req.params.id} | awbNumber: "${record.awbNumber}" | shipmozoOrderId: "${record.shipmozoOrderId}" | sourceOrderType: ${record.sourceOrderType}`);

    if (!record.shipmozoOrderId) {
      throw new ApiError(
        400,
        "No Shipmozo order ID stored — cannot sync. The push may not have completed successfully.",
      );
    }

    let orderDetail;
    try {
      const result = await shipmozoService.getOrderDetail(record.shipmozoOrderId);
      // Shipmozo returns data as an array — always take the first element
      const rawData = result?.data;
      orderDetail = Array.isArray(rawData) ? rawData[0] : (rawData ?? result);
    } catch (fetchErr) {
      // If Shipmozo returns 404 / not-found, treat as deleted from their side
      const status = fetchErr?.statusCode ?? fetchErr?.status ?? 0;
      if (status === 404 || fetchErr?.message?.toLowerCase().includes("not found")) {
        record.isCancelled = true;
        record.shipmentStatus = "CANCELLED";
        await record.save();
        return res.status(200).json(
          new ApiResponse(200, "Order not found on Shipmozo — marked as cancelled.", {
            cancelled: true,
            record: record.toObject(),
          }),
        );
      }
      throw fetchErr;
    }

    // Pull AWB and courier — Shipmozo nests these under shipping_details.
    // shipping_details can be [] (empty array) when no courier assigned yet.
    const shippingDetails = Array.isArray(orderDetail?.shipping_details)
      ? null
      : (orderDetail?.shipping_details ?? null);
    const awb = shippingDetails?.awb_number ?? orderDetail?.awb_number ?? orderDetail?.awb ?? null;
    const courier =
      shippingDetails?.courier_company ??
      (typeof orderDetail?.courier === "string"
        ? orderDetail.courier
        : (orderDetail?.courier?.name ?? orderDetail?.courier_name ?? null));

    // Validate AWB from Shipmozo before saving — reject test/junk values
    const awbCleaned = awb ? String(awb).trim() : null;
    if (awbCleaned && !isValidAwb(awbCleaned)) {
      console.warn(`[Sync] Rejected invalid AWB "${awbCleaned}" from Shipmozo for order ${record.sourceOrderId}`);
    }
    const validAwb = isValidAwb(awbCleaned) ? awbCleaned : null;
    console.log(`[Sync] AWB from Shipmozo: "${awb}" → validAwb: "${validAwb}" | record already has AWB: "${record.awbNumber}"`);

    if (validAwb && !record.awbNumber) {
      record.awbNumber = validAwb;
    }
    if (courier && !record.courierCompany) {
      record.courierCompany = courier;
    }

    // order_status from get-order-detail is a management status ("SCHEDULED" etc.), not
    // real-time tracking. If we now have an AWB, call track-order for the true current status.
    if (record.awbNumber) {
      try {
        const trackResult = await shipmozoService.trackOrder(record.awbNumber);
        const rawTrackData = trackResult?.data;
        const trackData = Array.isArray(rawTrackData) ? rawTrackData[0] : rawTrackData;
        const trackStatus = normalizeTrackingStatus(trackData?.current_status);
        if (trackStatus) {
          record.shipmentStatus = trackStatus;
          if (trackStatus === "CANCELLED") record.isCancelled = true;
        }
        if (trackData?.expected_delivery_date) {
          const parsedEdd = new Date(trackData.expected_delivery_date);
          if (!isNaN(parsedEdd.getTime())) record.expectedDeliveryDate = parsedEdd;
        }
      } catch (trackErr) {
        // Non-fatal — fall back to order_status from get-order-detail
        console.warn("[syncStatusForShipment] track-order failed (non-fatal):", trackErr.message);
        const rawStatus = orderDetail?.order_status ?? orderDetail?.status ?? null;
        const normalized = normalizeTrackingStatus(rawStatus);
        if (normalized && normalized !== record.shipmentStatus) {
          record.shipmentStatus = normalized;
        } else if (record.shipmentStatus === "PUSHED") {
          record.shipmentStatus = "ASSIGNED";
        }
      }
    } else {
      // No AWB — use order_status as best available signal
      const rawStatus = orderDetail?.order_status ?? orderDetail?.status ?? null;
      const normalized = normalizeTrackingStatus(rawStatus);
      if (normalized && normalized !== record.shipmentStatus) {
        record.shipmentStatus = normalized;
      }
    }

    record.lastTrackedAt = new Date();
    await record.save();

    // Write AWB to source order — isValidAwb guard is inside writeTrackingToSourceOrder
    await writeTrackingToSourceOrder(record);

    // Fire stage emails (all idempotent via their respective sentAt guards)
    await maybeFireDispatchEmail(record);  // Stage 1: AWB received
    await maybeFireTransitEmail(record);   // Stage 2: IN_TRANSIT
    await maybeFireDeliveredEmail(record); // Stage 3: DELIVERED

    return res.status(200).json(
      new ApiResponse(200, "Shipment synced from Shipmozo.", {
        cancelled: false,
        record: record.toObject(),
      }),
    );
  } catch (err) {
    next(err);
  }
};

export {
  pushOrderToCourier,
  getShipmentByOrderId,
  listWarehouses,
  listShipments,
  getRatesForShipment,
  assignCourierToShipment,
  getLabelForShipment,
  trackShipment,
  cancelShipment,
  getShippedOrderIds,
  syncAllStatuses,
  syncStatusForShipment,
};
