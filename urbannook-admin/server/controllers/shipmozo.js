const ShipmentRecord = require("../models/ShipmentRecord");
const InstagramOrder = require("../models/InstagramOrder");
const Order = require("../models/Order");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { parseAddress } = require("../utils/addressParser");
const shipmozoService = require("../services/shipmozoService");

// Valid payment types accepted by Shipmozo
const ALLOWED_PAYMENT_TYPES = new Set(["PREPAID", "COD"]);

// Valid order source types
const ALLOWED_ORDER_TYPES = new Set(["WEBSITE", "INSTAGRAM"]);

// Statuses from which cancellation is not allowed
const NON_CANCELLABLE_STATUSES = new Set(["DELIVERED", "CANCELLED", "RTO_DELIVERED"]);

// Map Shipmozo tracking status strings → our ShipmentRecord enum values
const TRACKING_STATUS_MAP = {
  "IN_TRANSIT":        "IN_TRANSIT",
  "OUT_FOR_DELIVERY":  "OUT_FOR_DELIVERY",
  "DELIVERED":         "DELIVERED",
  "RTO_INITIATED":     "RTO_INITIATED",
  "RTO_DELIVERED":     "RTO_DELIVERED",
  "CANCELLED":         "CANCELLED",
  "EXCEPTION":         "EXCEPTION",
};

// POST /admin/shipmozo/push-order
// Pushes a website or Instagram order to Shipmozo as a new shipment.
// Customer name/address are auto-mapped from the DB — zero manual typing.
const pushOrderToCourier = async (req, res, next) => {
  try {
    const { orderId, orderType, warehouseId, paymentType, weight, length, width, height } =
      req.body;

    // ── 1. Validate all 8 required fields ─────────────────────────────────────
    const errors = [];

    if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
      errors.push("orderId is required.");
    }
    if (!orderType || !ALLOWED_ORDER_TYPES.has(orderType)) {
      errors.push(`orderType must be one of: ${[...ALLOWED_ORDER_TYPES].join(", ")}.`);
    }
    if (!warehouseId || typeof warehouseId !== "string" || !warehouseId.trim()) {
      errors.push("warehouseId is required.");
    }
    if (!paymentType || !ALLOWED_PAYMENT_TYPES.has(paymentType)) {
      errors.push(`paymentType must be one of: ${[...ALLOWED_PAYMENT_TYPES].join(", ")}.`);
    }

    const numWeight = Number(weight);
    const numLength = Number(length);
    const numWidth  = Number(width);
    const numHeight = Number(height);

    if (!Number.isFinite(numWeight) || numWeight <= 0) errors.push("weight must be a positive number (grams).");
    if (!Number.isFinite(numLength) || numLength <= 0) errors.push("length must be a positive number (cm).");
    if (!Number.isFinite(numWidth)  || numWidth  <= 0) errors.push("width must be a positive number (cm).");
    if (!Number.isFinite(numHeight) || numHeight <= 0) errors.push("height must be a positive number (cm).");

    if (errors.length > 0) {
      throw new ApiError(400, errors.join(" "));
    }

    const cleanOrderId = orderId.trim();

    // ── 2. Duplicate check ────────────────────────────────────────────────────
    const existing = await ShipmentRecord.findOne({ sourceOrderId: cleanOrderId });
    if (existing) {
      throw new ApiError(400, "Shipment already exists for this order.");
    }

    // ── 3. Fetch source order ─────────────────────────────────────────────────
    let order;
    if (orderType === "INSTAGRAM") {
      order = await InstagramOrder.findOne({ orderId: cleanOrderId }).lean();
    } else {
      order = await Order.findOne({ orderId: cleanOrderId }).lean();
    }

    if (!order) {
      throw new ApiError(404, `Order "${cleanOrderId}" not found.`);
    }

    // ── 4. Build customer data ────────────────────────────────────────────────
    let consigneeName, consigneePhone, rawAddress;

    if (orderType === "INSTAGRAM") {
      consigneeName  = order.customerName;
      // Strip non-digits, then take last 10 digits to drop country code (91/+91)
      const rawDigits = order.contactNumber.replace(/\D/g, "");
      consigneePhone = parseInt(rawDigits.slice(-10), 10);
      rawAddress     = order.deliveryAddress;
    } else {
      // WEBSITE: name/phone not stored in Order model — use env var fallbacks.
      // TODO: replace with actual DB lookup once customer data is available here.
      consigneeName  = process.env.SHIPMOZO_FALLBACK_NAME  || "UrbanNook Customer";
      consigneePhone = parseInt(process.env.SHIPMOZO_FALLBACK_PHONE, 10) || 9999999999;
      rawAddress     = order.deliveryAddress?.formattedAddress || "";
    }

    // ── 5. Parse address string ───────────────────────────────────────────────
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
            (w) => String(w.id ?? w.warehouse_id ?? "").trim() === warehouseId.trim(),
          )
        : null;
      if (match) {
        pickupPincode =
          String(match.pincode ?? match.zip ?? match.postal_code ?? "").trim() || null;
      }
    } catch {
      console.warn("[Shipmozo] Could not resolve warehouse pincode — pickupPincode will be null");
    }

    // ── 6. Build product_detail array ────────────────────────────────────────
    const productDetail = (order.items || []).map((item) => ({
      name:             item.productSnapshot?.productName  || "Product",
      sku_number:       item.productId                     || "",
      quantity:         item.productSnapshot?.quantity     || 1,
      unit_price:       item.productSnapshot?.priceAtPurchase || 0,
      discount:         "",
      product_category: item.productSnapshot?.productCategory || "Other",
    }));

    // ── 7. Build Shipmozo payload ─────────────────────────────────────────────
    const shipmozoPayload = {
      order_id:                    cleanOrderId,
      order_date:                  new Date().toISOString().split("T")[0],
      consignee_name:              consigneeName,
      consignee_phone:             consigneePhone,
      consignee_address_line_one:  parsed.addressLine1,
      consignee_pin_code:          parseInt(parsed.pincode, 10),
      consignee_city:              parsed.city,
      consignee_state:             parsed.state,
      product_detail:              productDetail,
      payment_type:                paymentType,
      weight:                      numWeight,
      length:                      numLength,
      width:                       numWidth,
      height:                      numHeight,
      warehouse_id:                warehouseId.trim(),
    };

    // ── 8. Push to Shipmozo ───────────────────────────────────────────────────
    console.log("[Shipmozo] Target URL:", `${process.env.SHIPMOZO_BASE_URL}/push-order`);
    console.log("[Shipmozo] Pushing order payload:", JSON.stringify(shipmozoPayload, null, 2));
    const shipmozoResponse = await shipmozoService.pushOrder(shipmozoPayload);
    console.log("[Shipmozo] Success response:", JSON.stringify(shipmozoResponse, null, 2));

    // Shipmozo generates its own order_id (e.g. "48321AP367463468983").
    // Our UUID is stored as data.refrence_id (their typo) and is NOT accepted by
    // assign-courier, rate-calculator, or cancel-order — we must use their ID.
    const shipmozoGeneratedId = shipmozoResponse?.data?.order_id ?? null;
    if (!shipmozoGeneratedId) {
      console.warn("[Shipmozo] push-order response did not include data.order_id — shipmozoOrderId will be null");
    }

    // ── 9. Persist shipment record ────────────────────────────────────────────
    const record = await ShipmentRecord.create({
      sourceOrderId:   cleanOrderId,
      sourceOrderType: orderType,
      shipmozoOrderId: shipmozoGeneratedId,
      warehouseId:     warehouseId.trim(),
      paymentType,
      weight:          numWeight,
      length:          numLength,
      width:           numWidth,
      height:          numHeight,
      shipmentStatus:  "PUSHED",
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
    const record = await ShipmentRecord.findOne({
      sourceOrderId: req.params.orderId,
    }).lean();

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
const listWarehouses = async (req, res, next) => {
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
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    // Build status match — supports single value or comma-separated for tab groups
    const matchStage = {};
    if (req.query.status) {
      const statuses = req.query.status.split(",").map((s) => s.trim()).filter(Boolean);
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
                if:   { $eq: ["$sourceOrderType", "INSTAGRAM"] },
                then: { $arrayElemAt: ["$_igOrder", 0] },
                else: { $arrayElemAt: ["$_webOrder", 0] },
              },
            },
          },
        },
        // Drop the raw lookup arrays + heavy fields not needed in list view
        {
          $project: {
            _webOrder:      0,
            _igOrder:       0,
            labelBase64:    0,
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
          totalPages:  Math.max(1, Math.ceil(totalCount / limit)),
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
          ? await InstagramOrder.findOne({ orderId: record.sourceOrderId }, { amount: 1 }).lean()
          : await Order.findOne({ orderId: record.sourceOrderId }, { amount: 1 }).lean();
      orderAmount = sourceOrder?.amount ?? 0;
    } catch {
      // Non-fatal — proceed with 0
    }

    const ratePayload = {
      order_id:         record.shipmozoOrderId || record.sourceOrderId,
      pickup_pincode:   parseInt(record.pickupPincode,   10),
      delivery_pincode: parseInt(record.deliveryPincode, 10),
      payment_type:     record.paymentType,
      shipment_type:    "FORWARD",
      order_amount:     orderAmount,
      type_of_package:  "SPS",
      rov_type:         "ROV_OWNER",
      cod_amount:       record.paymentType === "COD" ? String(orderAmount) : "",
      weight:           record.weight,
      dimensions: [
        {
          no_of_box: "1",
          length:    String(record.length),
          width:     String(record.width),
          height:    String(record.height),
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

    const result = await shipmozoService.assignCourier({
      order_id:   record.shipmozoOrderId || record.sourceOrderId,
      courier_id: Number(courierId),
    });

    // result.data: { order_id, reference_id, courier, awb_number? }
    // Normalize courier name — Shipmozo may return string or object
    const courierName =
      typeof result.data?.courier === "string"
        ? result.data.courier
        : result.data?.courier?.name ?? null;

    record.shipmentStatus = "ASSIGNED";
    record.courierCompany = courierName;

    // Prefer awb_number from assign response; fall back to reference_id
    const awbFromAssign = result.data?.awb_number ?? result.data?.reference_id ?? null;
    if (awbFromAssign && !record.awbNumber) {
      record.awbNumber = String(awbFromAssign);
    }

    // For couriers that don't auto-schedule pickup, call schedulePickup to obtain AWB
    if (!record.awbNumber) {
      try {
        const pickupResult = await shipmozoService.schedulePickup(
          record.shipmozoOrderId || record.sourceOrderId,
        );
        const awbFromPickup =
          pickupResult?.data?.awb_number ??
          pickupResult?.data?.reference_id ??
          null;
        if (awbFromPickup) {
          record.awbNumber = String(awbFromPickup);
          record.shipmentStatus = "PICKUP_SCHEDULED";
        }
      } catch (pickupErr) {
        // Non-fatal — AWB may arrive later via tracking webhook
        console.warn("[Shipmozo] schedulePickup failed (non-fatal):", pickupErr?.message);
      }
    }

    await record.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Courier assigned successfully.", record.toObject()));
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
      throw new ApiError(400, "No AWB number — courier has not been assigned yet.");
    }

    // Return cached label without hitting Shipmozo again
    if (record.labelBase64) {
      return res
        .status(200)
        .json(new ApiResponse(200, "Label fetched (cached).", { label: record.labelBase64 }));
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
    const record = await ShipmentRecord.findById(req.params.id).lean();
    if (!record) throw new ApiError(404, "Shipment record not found.");
    if (!record.awbNumber) {
      throw new ApiError(400, "No AWB number to track — courier has not been assigned yet.");
    }

    const result   = await shipmozoService.trackOrder(record.awbNumber);
    const trackData = result?.data ?? result;

    // Sync status and dates back to our record
    const updateFields = { lastTrackedAt: new Date() };

    if (trackData?.current_status && TRACKING_STATUS_MAP[trackData.current_status]) {
      updateFields.shipmentStatus = TRACKING_STATUS_MAP[trackData.current_status];
    }
    if (trackData?.expected_delivery_date) {
      const parsed = new Date(trackData.expected_delivery_date);
      if (!isNaN(parsed.getTime())) updateFields.expectedDeliveryDate = parsed;
    }

    await ShipmentRecord.findByIdAndUpdate(record._id, updateFields);

    return res
      .status(200)
      .json(new ApiResponse(200, "Tracking data fetched.", trackData));
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

    // Shipmozo requires awb_number as a number; use 0 for PUSHED orders with no AWB
    const awbNum = record.awbNumber ? parseInt(record.awbNumber, 10) : 0;

    await shipmozoService.cancelOrder({
      order_id:   record.shipmozoOrderId || record.sourceOrderId,
      awb_number: isNaN(awbNum) ? 0 : awbNum,
    });

    record.shipmentStatus = "CANCELLED";
    record.isCancelled    = true;
    await record.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Shipment cancelled.", record.toObject()));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  pushOrderToCourier,
  getShipmentByOrderId,
  listWarehouses,
  listShipments,
  getRatesForShipment,
  assignCourierToShipment,
  getLabelForShipment,
  trackShipment,
  cancelShipment,
};
