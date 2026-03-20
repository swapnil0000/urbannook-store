const InstagramOrder = require("../models/InstagramOrder");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const orderEventEmitter = require("../utils/orderEvents");

// Whitelisted sort fields
const ALLOWED_SORT_FIELDS = new Set(["createdAt", "amount"]);

// Valid statuses
const ALLOWED_STATUSES = new Set(["CREATED", "PAID", "FAILED"]);

//   GET /admin/orders/instagram
const getAllInstagramOrders = async (req, res, next) => {
  try {
    //   Pagination
    const rawPage = parseInt(req.query.page, 10);
    const rawLimit = parseInt(req.query.limit, 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip = (page - 1) * limit;

    //   Sorting
    const sortBy = ALLOWED_SORT_FIELDS.has(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    //   Filtering
    const filter = {};

    if (req.query.status && ALLOWED_STATUSES.has(req.query.status)) {
      filter.status = req.query.status;
    }

    const rawStart = req.query.startDate;
    const rawEnd = req.query.endDate;
    const startDate = rawStart ? new Date(rawStart) : null;
    const endDate = rawEnd ? new Date(rawEnd) : null;
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

    //   Query — find + count in parallel
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
// Creates a manual Instagram order. Products are fetched server-side to build
// the productSnapshot and compute the total — client-submitted prices are ignored.
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

    //  Field-level validation
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

    //   Fetch all products in one query
    const productIds = items.map((i) => i.productId.trim());
    const products = await Product.find({
      productId: { $in: productIds },
    }).lean();
    const productMap = new Map(products.map((p) => [p.productId, p]));

    // Verify every productId exists
    const missingIds = productIds.filter((id) => !productMap.has(id));
    if (missingIds.length > 0) {
      throw new ApiError(400, `Products not found: ${missingIds.join(", ")}`);
    }

    // Reject unavailable products
    const unavailableNames = productIds
      .filter((id) => {
        const p = productMap.get(id);
        return (
          p.productStatus === "out_of_stock" ||
          p.productStatus === "discontinued"
        );
      })
      .map((id) => productMap.get(id).productName);

    if (unavailableNames.length > 0) {
      throw new ApiError(
        400,
        `Unavailable products: ${unavailableNames.join(", ")}`,
      );
    }

    //   Build items with snapshots
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

    //   Compute total server-side
    const amount = builtItems.reduce(
      (sum, item) =>
        sum +
        item.productSnapshot.priceAtPurchase * item.productSnapshot.quantity,
      0,
    );

    //   Generate orderId via atomic counter
    const counter = await Counter.findByIdAndUpdate(
      "instagram_order",
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true },
    );
    const orderId = `IG-${String(counter.sequence_value).padStart(4, "0")}`;

    //   Insert the order
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

    // The MongoDB Change Stream in index.js fires automatically and pushes
    // this new order to SSE clients via orderEventEmitter("new_instagram_order").

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Instagram order created successfully", order),
      );
  } catch (err) {
    next(err);
  }
};

//   GET /admin/orders/instagram/stream  (Server-Sent Events)
// Pushes new Instagram orders to the client in real time.
// Listens to "new_instagram_order" events — fully separate from website SSE.
const streamInstagramOrders = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Flush initial bytes so the browser opens the stream immediately
  res.write(":\n\n");

  // 25-second heartbeat to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(":\n\n");
  }, 25_000);

  const sendOrder = (order) => {
    try {
      res.write(
        `event: new_instagram_order\ndata: ${JSON.stringify(order)}\n\n`,
      );
    } catch {
      // Client disconnected — cleanup runs on "close"
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

module.exports = {
  getAllInstagramOrders,
  createInstagramOrder,
  streamInstagramOrders,
};
