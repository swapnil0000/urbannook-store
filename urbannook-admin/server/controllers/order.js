import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Waitlist from "../models/Waitlist.js";
import User from "../models/User.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import orderEventEmitter from "../utils/orderEvents.js";

// Whitelisted sort fields — prevents arbitrary field injection
const ALLOWED_SORT_FIELDS = new Set(["createdAt", "amount"]);

// Valid payment statuses from the Order schema enum
const ALLOWED_STATUSES = new Set(["CREATED", "PAID", "FAILED"]);

//   GET /admin/orders
const getAllOrders = async (req, res) => {
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

  if (req.query.fulfillmentStatus) {
    filter.fulfillmentStatus = req.query.fulfillmentStatus;
  }

  if (req.query.search) {
    filter.orderId = { $regex: req.query.search, $options: "i" };
  }

  const rawStart = req.query.startDate;
  const rawEnd = req.query.endDate;
  const startDate = rawStart ? new Date(rawStart) : null;
  const endDate = rawEnd ? new Date(rawEnd) : null;
  const startValid = startDate && !isNaN(startDate.getTime());
  const endValid = endDate && !isNaN(endDate.getTime());

  if (startValid && endValid && startDate > endDate) {
    return res.status(200).json(
      new ApiResponse(200, "Orders fetched successfully", {
        orders: [],
        pagination: { currentPage: page, totalPages: 0, totalOrders: 0, limit },
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
    Order.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const totalPages = totalOrders > 0 ? Math.ceil(totalOrders / limit) : 0;

  return res.status(200).json(
    new ApiResponse(200, "Orders fetched successfully", {
      orders,
      pagination: { currentPage: page, totalPages, totalOrders, limit },
    }),
  );
};

//   GET /admin/orders/:orderId
const getOrderById = async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findOne({ orderId });
  if (!order) throw new ApiError(404, "Order not found");
  return res.status(200).json(new ApiResponse(200, "Order fetched successfully", order));
};

//   PATCH /admin/orders/:orderId/status
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { fulfillmentStatus } = req.body;

  const validStatuses = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(fulfillmentStatus)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const order = await Order.findOneAndUpdate(
    { orderId },
    { fulfillmentStatus },
    { new: true },
  );
  if (!order) throw new ApiError(404, "Order not found");

  return res.status(200).json(new ApiResponse(200, "Order status updated", order));
};

//   PATCH /admin/orders/:orderId/tracking
const updateOrderTracking = async (req, res) => {
  const { orderId } = req.params;
  const { carrier, trackingNumber } = req.body;

  if (!carrier || !trackingNumber) {
    throw new ApiError(400, "Carrier and tracking number are required");
  }

  const order = await Order.findOneAndUpdate(
    { orderId },
    { tracking: { carrier, trackingNumber, updatedAt: new Date() } },
    { new: true },
  );
  if (!order) throw new ApiError(404, "Order not found");

  return res.status(200).json(new ApiResponse(200, "Tracking info updated", order));
};

//   GET /admin/dashboard/stats
const getDashboardStats = async (req, res) => {
  const [
    totalOrders,
    totalProducts,
    totalWaitlist,
    revenueResult,
    pendingOrders,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments({ status: "PAID" }),
    Product.countDocuments(),
    Waitlist.countDocuments(),
    Order.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Order.countDocuments({ status: "PAID", fulfillmentStatus: "PROCESSING" }),
    Order.find({ status: "PAID" }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;

  return res.status(200).json(
    new ApiResponse(200, "Dashboard stats fetched", {
      totalOrders,
      totalProducts,
      totalWaitlist,
      totalRevenue,
      pendingOrders,
      recentOrders,
    }),
  );
};

//   GET /admin/orders/stream  (Server-Sent Events)
const streamOrders = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(":\n\n");

  const heartbeat = setInterval(() => {
    res.write(":\n\n");
  }, 25_000);

  const sendOrder = (order) => {
    try {
      res.write(`event: new_order\ndata: ${JSON.stringify(order)}\n\n`);
    } catch {
      // client disconnected
    }
  };

  orderEventEmitter.on("new_order", sendOrder);
  console.log(`[SSE] Client connected (${req.admin?.email ?? "unknown"})`);

  req.on("close", () => {
    clearInterval(heartbeat);
    orderEventEmitter.off("new_order", sendOrder);
    console.log(`[SSE] Client disconnected (${req.admin?.email ?? "unknown"})`);
  });
};

export {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderTracking,
  getDashboardStats,
  streamOrders,
};
