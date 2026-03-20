import InstagramOrder from "../models/InstagramOrder.js";
import Product from "../models/Product.js";
import Counter from "../models/Counter.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import orderEventEmitter from "../utils/orderEvents.js";

const ALLOWED_SORT_FIELDS = new Set(["createdAt", "amount"]);
const ALLOWED_STATUSES = new Set(["CREATED", "PAID", "FAILED"]);

//   GET /admin/orders/instagram from ig new changes
 const getAllInstagramOrders = async (req, res, next) => {
  try {
    const rawPage = parseInt(req.query.page, 10);
    const rawLimit = parseInt(req.query.limit, 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip = (page - 1) * limit;

    const sortBy = ALLOWED_SORT_FIELDS.has(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter = {};
    if (req.query.status && ALLOWED_STATUSES.has(req.query.status)) {
      filter.status = req.query.status;
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const startValid = startDate && !isNaN(startDate.getTime());
    const endValid = endDate && !isNaN(endDate.getTime());

    if (startValid && endValid && startDate > endDate) {
      return res.status(200).json(
        new ApiResponse(200, "Instagram orders fetched successfully", {
          orders: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalOrders: 0,
            limit,
          },
        }),
      );
    }

    if (startValid || endValid) {
      filter.createdAt = {};
      if (startValid) filter.createdAt.$gte = startDate;
      if (endValid) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    const [orders, totalOrders] = await Promise.all([
      InstagramOrder.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      InstagramOrder.countDocuments(filter),
    ]);

    const totalPages = totalOrders > 0 ? Math.ceil(totalOrders / limit) : 0;

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

//  POST /admin/orders/instagram
 const createInstagramOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      contactNumber,
      deliveryAddress,
      notes,
      status,
      items,
    } = req.body;

    const validationErrors = [];
    if (!customerName?.trim())
      validationErrors.push("Customer name is required.");
    if (!contactNumber?.trim())
      validationErrors.push("Contact number is required.");
    if (!deliveryAddress?.trim())
      validationErrors.push("Delivery address is required.");
    if (!Array.isArray(items) || items.length === 0) {
      validationErrors.push("At least one item is required.");
    } else {
      items.forEach((item, i) => {
        if (!item.productId?.trim())
          validationErrors.push(`Item ${i + 1}: product is required.`);
        const qty = parseInt(item.quantity, 10);
        if (!Number.isFinite(qty) || qty < 1)
          validationErrors.push(`Item ${i + 1}: quantity must be at least 1.`);
      });
    }
    if (status !== undefined && !ALLOWED_STATUSES.has(status)) {
      validationErrors.push(
        `Status must be one of: ${[...ALLOWED_STATUSES].join(", ")}.`,
      );
    }
    if (validationErrors.length > 0)
      throw new ApiError(400, validationErrors.join(" "));

    const productIds = items.map((i) => i.productId.trim());
    const products = await Product.find({
      productId: { $in: productIds },
    }).lean();
    const productMap = new Map(products.map((p) => [p.productId, p]));

    const missingIds = productIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0)
      throw new ApiError(400, `Products not found: ${missingIds.join(", ")}`);

    const unavailableNames = productIds
      .filter((id) =>
        ["out_of_stock", "discontinued"].includes(
          productMap.get(id).productStatus,
        ),
      )
      .map((id) => productMap.get(id).productName);
    if (unavailableNames.length > 0)
      throw new ApiError(
        400,
        `Unavailable products: ${unavailableNames.join(", ")}`,
      );

    const builtItems = items.map((item) => {
      const p = productMap.get(item.productId.trim());
      const quantity = parseInt(item.quantity, 10);
      return {
        productId: p.productId,
        productSnapshot: {
          productName: p.productName,
          productImg: p.productImg,
          quantity,
          productCategory: p.productCategory,
          productSubCategory: p.productSubCategory ?? null,
          priceAtPurchase: p.sellingPrice,
        },
      };
    });

    const amount = builtItems.reduce(
      (sum, item) =>
        sum +
        item.productSnapshot.priceAtPurchase * item.productSnapshot.quantity,
      0,
    );

    const counter = await Counter.findByIdAndUpdate(
      "instagram_order",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true },
    );
    const orderId = `IG-${String(counter.sequence_value).padStart(4, "0")}`;

    const order = await InstagramOrder.create({
      orderId,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      deliveryAddress: deliveryAddress.trim(),
      notes: notes?.trim() || undefined,
      items: builtItems,
      amount,
      status: status ?? "CREATED",
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Instagram order created successfully", order),
      );
  } catch (err) {
    next(err);
  }
};

//   GET /admin/orders/instagram/stream  (SSE)
 const streamInstagramOrders = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(":\n\n");

  const heartbeat = setInterval(() => res.write(":\n\n"), 25_000);

  const sendOrder = (order) => {
    try {
      res.write(
        `event: new_instagram_order\ndata: ${JSON.stringify(order)}\n\n`,
      );
    } catch {
      /* client disconnected */
    }
  };

  orderEventEmitter.on("new_instagram_order", sendOrder);
  console.log(
    `[SSE:Instagram] Client connected (${req.admin?.email ?? "unknown"})`,
  );

  req.on("close", () => {
    clearInterval(heartbeat);
    orderEventEmitter.off("new_instagram_order", sendOrder);
    console.log(
      `[SSE:Instagram] Client disconnected (${req.admin?.email ?? "unknown"})`,
    );
  });
};

// PUT /admin/orders/instagram/:orderId
// Updates an existing Instagram order. Product snapshots are rebuilt from current
// product data so prices are always current. orderId is immutable.
const updateInstagramOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      contactNumber,
      deliveryAddress,
      notes,
      status,
      items,
    } = req.body;

    // ── Validate ──────────────────────────────────────────────────────────────
    const validationErrors = [];

    if (
      !customerName ||
      typeof customerName !== "string" ||
      !customerName.trim()
    ) {
      validationErrors.push("Customer name is required.");
    }
    if (
      !contactNumber ||
      typeof contactNumber !== "string" ||
      !contactNumber.trim()
    ) {
      validationErrors.push("Contact number is required.");
    }
    if (
      !deliveryAddress ||
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim()
    ) {
      validationErrors.push("Delivery address is required.");
    }
    if (!Array.isArray(items) || items.length === 0) {
      validationErrors.push("At least one item is required.");
    } else {
      items.forEach((item, i) => {
        if (
          !item.productId ||
          typeof item.productId !== "string" ||
          !item.productId.trim()
        ) {
          validationErrors.push(`Item ${i + 1}: product is required.`);
        }
        const qty = parseInt(item.quantity, 10);
        if (!Number.isFinite(qty) || qty < 1) {
          validationErrors.push(`Item ${i + 1}: quantity must be at least 1.`);
        }
      });
    }
    if (status !== undefined && !ALLOWED_STATUSES.has(status)) {
      validationErrors.push(
        `Status must be one of: ${[...ALLOWED_STATUSES].join(", ")}.`,
      );
    }

    if (validationErrors.length > 0) {
      throw new ApiError(400, validationErrors.join(" "));
    }

    // ── Find order ────────────────────────────────────────────────────────────
    const order = await InstagramOrder.findOne({ orderId: req.params.orderId });
    if (!order)
      throw new ApiError(
        404,
        `Instagram order "${req.params.orderId}" not found.`,
      );

    // ── Rebuild items with fresh product snapshots ────────────────────────────
    const productIds = items.map((i) => i.productId.trim());
    const products = await Product.find({
      productId: { $in: productIds },
    }).lean();
    const productMap = new Map(products.map((p) => [p.productId, p]));

    const missingIds = productIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0) {
      throw new ApiError(400, `Products not found: ${missingIds.join(", ")}`);
    }

    const builtItems = items.map((item) => {
      const p = productMap.get(item.productId.trim());
      const quantity = parseInt(item.quantity, 10);
      return {
        productId: p.productId,
        productSnapshot: {
          productName: p.productName,
          productImg: p.productImg,
          quantity,
          productCategory: p.productCategory,
          productSubCategory: p.productSubCategory ?? null,
          priceAtPurchase: p.sellingPrice,
        },
      };
    });

    const amount = builtItems.reduce(
      (sum, item) =>
        sum +
        item.productSnapshot.priceAtPurchase * item.productSnapshot.quantity,
      0,
    );

    // ── Apply changes ─────────────────────────────────────────────────────────
    order.customerName = customerName.trim();
    order.contactNumber = contactNumber.trim();
    order.deliveryAddress = deliveryAddress.trim();
    order.notes = notes?.trim() || undefined;
    order.items = builtItems;
    order.amount = amount;
    if (status) order.status = status;

    await order.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Instagram order updated successfully.", order),
      );
  } catch (err) {
    next(err);
  }
};

export {
  getAllInstagramOrders,
  createInstagramOrder,
  streamInstagramOrders,
};
