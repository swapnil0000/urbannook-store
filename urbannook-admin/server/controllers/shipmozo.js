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

    // ── 9. Persist shipment record ────────────────────────────────────────────
    const record = await ShipmentRecord.create({
      sourceOrderId:   cleanOrderId,
      sourceOrderType: orderType,
      warehouseId:     warehouseId.trim(),
      paymentType,
      weight:          numWeight,
      length:          numLength,
      width:           numWidth,
      height:          numHeight,
      shipmentStatus:  "PUSHED",
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

module.exports = { pushOrderToCourier, getShipmentByOrderId, listWarehouses };
