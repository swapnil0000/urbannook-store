import InstagramOrder from "../models/instagram.order.model.js";
import Product        from "../models/product.model.js";
import Counter        from "../models/counter.model.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import orderEventEmitter from "../utils/orderEvents.js";

const ALLOWED_SORT_FIELDS = new Set(["createdAt", "amount"]);
const ALLOWED_STATUSES    = new Set(["CREATED", "PAID", "FAILED"]);

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/orders/instagram
// ─────────────────────────────────────────────────────────────────────────────
const getAllInstagramOrders = async (req, res, next) => {
  try {
    const rawPage  = parseInt(req.query.page,  10);
    const rawLimit = parseInt(req.query.limit, 10);
    const page  = Number.isFinite(rawPage)  && rawPage  > 0 ? rawPage  : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip  = (page - 1) * limit;

    const sortBy    = ALLOWED_SORT_FIELDS.has(req.query.sortBy) ? req.query.sortBy : "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const startDate  = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate    = req.query.endDate   ? new Date(req.query.endDate)   : null;
    const startValid = startDate && !isNaN(startDate.getTime());
    const endValid   = endDate   && !isNaN(endDate.getTime());

    if (startValid && endValid && startDate > endDate) {
      return res.status(200).json(
        new ApiResponse(200, "Instagram orders fetched successfully", {
          orders: [],
          pagination: { currentPage: page, totalPages: 0, totalOrders: 0, limit },
        }),
      );
    }

    const pipeline = [];

    pipeline.push({
      $addFields: { effectiveDate: { $ifNull: ["$orderedAt", "$createdAt"] } },
    });

    const matchStage = {};
    if (req.query.status && ALLOWED_STATUSES.has(req.query.status)) {
      matchStage.status = req.query.status;
    }
    if (startValid || endValid) {
      matchStage.effectiveDate = {};
      if (startValid) matchStage.effectiveDate.$gte = startDate;
      if (endValid) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        matchStage.effectiveDate.$lte = endOfDay;
      }
    }
    if (Object.keys(matchStage).length) pipeline.push({ $match: matchStage });

    const sortField = sortBy === "createdAt" ? "effectiveDate" : sortBy;
    pipeline.push({ $sort: { [sortField]: sortOrder } });

    pipeline.push({
      $facet: {
        orders: [{ $skip: skip }, { $limit: limit }],
        total:  [{ $count: "n" }],
      },
    });

    const [result]  = await InstagramOrder.aggregate(pipeline);
    const orders      = result?.orders ?? [];
    const totalOrders = result?.total[0]?.n ?? 0;
    const totalPages  = totalOrders > 0 ? Math.ceil(totalOrders / limit) : 0;

    return res.status(200).json(
      new ApiResponse(200, "Instagram orders fetched successfully", {
        orders,
        pagination: { currentPage: page, totalPages, totalOrders, limit },
      }),
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/orders/instagram/payment-link
// Quick flow: name + amount only → creates order → returns checkout URL.
// ─────────────────────────────────────────────────────────────────────────────
const createPaymentLinkOrder = async (req, res, next) => {
  try {
    const { productId, productName, amount: rawAmount, notes } = req.body;

    const validationErrors = [];
    if (!productId?.trim())   validationErrors.push("Product is required.");
    if (!productName?.trim()) validationErrors.push("Product name is required.");
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0)
      validationErrors.push("Amount must be a positive number.");
    if (validationErrors.length > 0) throw new ApiError(400, validationErrors.join(" "));

    const counter = await Counter.findByIdAndUpdate(
      "instagram_order",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true },
    );
    const orderId = `IG-${String(counter.sequence_value).padStart(4, "0")}`;

    const order = await InstagramOrder.create({
      orderId,
      customerName: "Pending", // filled by customer on checkout page
      productName:  productName.trim(),
      notes:        notes?.trim() || undefined,
      amount,
      status:       "CREATED",
    });

    orderEventEmitter.emit("new_instagram_order", order.toObject());

    const baseUrl     = process.env.IG_CHECKOUT_BASE_URL || "https://urbannook.in/ig-checkout";
    const checkoutUrl = `${baseUrl}/${orderId}`;

    return res.status(201).json(
      new ApiResponse(201, "Checkout link created successfully", {
        ...order.toObject(),
        productName: productName.trim(),
        checkoutUrl,
      }),
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/orders/instagram
// Full manual create (name + contact + address + items).
// ─────────────────────────────────────────────────────────────────────────────
const createInstagramOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      contactNumber,
      deliveryAddress,
      notes,
      status,
      items,
      orderedAt,
    } = req.body;

    const validationErrors = [];
    if (!customerName?.trim())    validationErrors.push("Customer name is required.");
    if (!contactNumber?.trim())   validationErrors.push("Contact number is required.");
    if (!deliveryAddress?.trim()) validationErrors.push("Delivery address is required.");
    if (!Array.isArray(items) || items.length === 0) {
      validationErrors.push("At least one item is required.");
    } else {
      items.forEach((item, i) => {
        if (!item.productId?.trim()) validationErrors.push(`Item ${i + 1}: product is required.`);
        const qty = parseInt(item.quantity, 10);
        if (!Number.isFinite(qty) || qty < 1) validationErrors.push(`Item ${i + 1}: quantity must be at least 1.`);
      });
    }
    if (status !== undefined && !ALLOWED_STATUSES.has(status)) {
      validationErrors.push(`Status must be one of: ${[...ALLOWED_STATUSES].join(", ")}.`);
    }
    if (validationErrors.length > 0) throw new ApiError(400, validationErrors.join(" "));

    const productIds = items.map((i) => i.productId.trim());
    const products   = await Product.find({ productId: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [p.productId, p]));

    const missingIds = productIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0) throw new ApiError(400, `Products not found: ${missingIds.join(", ")}`);

    const builtItems = items.map((item) => {
      const p        = productMap.get(item.productId.trim());
      const quantity = parseInt(item.quantity, 10);
      return {
        productId: p.productId,
        productSnapshot: {
          productName:        p.productName,
          productImg:         p.productImg,
          quantity,
          productCategory:    p.productCategory,
          productSubCategory: p.productSubCategory ?? null,
          priceAtPurchase:    p.sellingPrice,
        },
      };
    });

    const amount = builtItems.reduce(
      (sum, item) => sum + item.productSnapshot.priceAtPurchase * item.productSnapshot.quantity,
      0,
    );

    const counter = await Counter.findByIdAndUpdate(
      "instagram_order",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true },
    );
    const orderId = `IG-${String(counter.sequence_value).padStart(4, "0")}`;

    const parsedOrderedAt    = orderedAt ? new Date(orderedAt) : null;
    const effectiveOrderedAt = parsedOrderedAt && !isNaN(parsedOrderedAt) ? parsedOrderedAt : new Date();

    const order = await InstagramOrder.create({
      orderId,
      customerName:    customerName.trim(),
      contactNumber:   contactNumber.trim(),
      deliveryAddress: deliveryAddress.trim(),
      notes:           notes?.trim() || undefined,
      items:           builtItems,
      amount,
      status:          status ?? "CREATED",
      orderedAt:       effectiveOrderedAt,
    });

    orderEventEmitter.emit("new_instagram_order", order.toObject());

    return res.status(201).json(
      new ApiResponse(201, "Instagram order created successfully", order),
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /admin/orders/instagram/:orderId  — manual edit (address, items, etc.)
// ─────────────────────────────────────────────────────────────────────────────
const updateInstagramOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      contactNumber,
      deliveryAddress,
      email,
      notes,
      status,
      orderedAt,
    } = req.body;

    const validationErrors = [];
    if (!customerName?.trim()) validationErrors.push("Customer name is required.");
    if (status !== undefined && !ALLOWED_STATUSES.has(status)) {
      validationErrors.push(`Status must be one of: ${[...ALLOWED_STATUSES].join(", ")}.`);
    }
    if (validationErrors.length > 0) throw new ApiError(400, validationErrors.join(" "));

    const order = await InstagramOrder.findOne({ orderId: req.params.orderId });
    if (!order) throw new ApiError(404, `Instagram order "${req.params.orderId}" not found.`);

    order.customerName    = customerName.trim();
    if (contactNumber   !== undefined) order.contactNumber   = contactNumber?.trim()   || undefined;
    if (deliveryAddress !== undefined) order.deliveryAddress = deliveryAddress?.trim() || undefined;
    if (email           !== undefined) order.email           = email?.trim()           || undefined;
    if (notes           !== undefined) order.notes           = notes?.trim()           || undefined;
    if (status)                        order.status          = status;

    const parsedOrderedAt = orderedAt ? new Date(orderedAt) : null;
    if (parsedOrderedAt && !isNaN(parsedOrderedAt)) order.orderedAt = parsedOrderedAt;

    await order.save();

    return res.status(200).json(
      new ApiResponse(200, "Instagram order updated successfully.", order),
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/orders/instagram/stream  — SSE
// ─────────────────────────────────────────────────────────────────────────────
const streamInstagramOrders = (req, res) => {
  res.writeHead(200, {
    "Content-Type":    "text/event-stream",
    "Cache-Control":   "no-cache, no-transform",
    Connection:        "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(":\n\n");

  const heartbeat = setInterval(() => res.write(":\n\n"), 25_000);

  const sendOrder = (order) => {
    try {
      res.write(`event: new_instagram_order\ndata: ${JSON.stringify(order)}\n\n`);
    } catch { /* client disconnected */ }
  };

  orderEventEmitter.on("new_instagram_order", sendOrder);

  req.on("close", () => {
    clearInterval(heartbeat);
    orderEventEmitter.off("new_instagram_order", sendOrder);
  });
};

export {
  getAllInstagramOrders,
  createInstagramOrder,
  createPaymentLinkOrder,
  updateInstagramOrder,
  streamInstagramOrders,
};
