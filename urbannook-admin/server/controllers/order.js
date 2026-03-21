import Order from "../models/Order.js";
import InstagramOrder from "../models/InstagramOrder.js";
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
  return res
    .status(200)
    .json(new ApiResponse(200, "Order fetched successfully", order));
};

//   PATCH /admin/orders/:orderId/status
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { fulfillmentStatus } = req.body;

  const validStatuses = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(fulfillmentStatus)) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const order = await Order.findOneAndUpdate(
    { orderId },
    { fulfillmentStatus },
    { new: true },
  );
  if (!order) throw new ApiError(404, "Order not found");

  return res
    .status(200)
    .json(new ApiResponse(200, "Order status updated", order));
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

  return res
    .status(200)
    .json(new ApiResponse(200, "Tracking info updated", order));
};

//   GET /admin/dashboard/stats
const getDashboardStats = async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // For trend calculations: today = midnight → now, yesterday = prev full day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  const [webResult, instaResult, waitlist, latestProducts] = await Promise.all([
    // ── Web orders: single $facet for all KPIs + chart + recent orders ──
    Order.aggregate([
      {
        $facet: {
          kpi: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                revenue: { $sum: "$amount" },
              },
            },
          ],
          pendingCount: [
            { $match: { status: "PAID", fulfillmentStatus: "PROCESSING" } },
            { $count: "n" },
          ],
          todayOrders: [
            { $match: { status: "PAID", createdAt: { $gte: todayStart } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$amount" },
              },
            },
          ],
          yesterdayOrders: [
            {
              $match: {
                status: "PAID",
                createdAt: { $gte: yesterdayStart, $lt: todayStart },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$amount" },
              },
            },
          ],
          chart: [
            { $match: { status: "PAID", createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                webOrders: { $sum: 1 },
                webRevenue: { $sum: "$amount" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          recentOrders: [
            { $match: { status: "PAID" } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                orderId: 1,
                amount: 1,
                fulfillmentStatus: 1,
                createdAt: 1,
                _id: 0,
              },
            },
          ],
        },
      },
    ]),

    // ── Instagram orders: KPIs + chart + today/yesterday ──
    InstagramOrder.aggregate([
      {
        $facet: {
          kpi: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                revenue: { $sum: "$amount" },
              },
            },
          ],
          chart: [
            { $match: { status: "PAID", createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                instaOrders: { $sum: 1 },
                instaRevenue: { $sum: "$amount" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          todayOrders: [
            { $match: { status: "PAID", createdAt: { $gte: todayStart } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$amount" },
              },
            },
          ],
          yesterdayOrders: [
            {
              $match: {
                status: "PAID",
                createdAt: { $gte: yesterdayStart, $lt: todayStart },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$amount" },
              },
            },
          ],
          recentOrders: [
            { $match: { status: "PAID" } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { orderId: 1, amount: 1, createdAt: 1, _id: 0 } },
          ],
        },
      },
    ]),

    Waitlist.countDocuments(),

    Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "productName productImg productStatus sellingPrice productQuantity",
      )
      .lean(),
  ]);

  // ── Parse web KPI ──
  const webFacet = webResult[0];
  const webKpi = {};
  for (const row of webFacet.kpi)
    webKpi[row._id] = { count: row.count, revenue: row.revenue };
  const webOrders = webKpi.PAID?.count ?? 0;
  const webRevenue = webKpi.PAID?.revenue ?? 0;
  const webCreated = webKpi.CREATED?.count ?? 0;
  const pending = webFacet.pendingCount[0]?.n ?? 0;

  // ── Web today/yesterday ──
  const webTodayCount = webFacet.todayOrders[0]?.count ?? 0;
  const webYesterdayCount = webFacet.yesterdayOrders[0]?.count ?? 0;
  const webTodayRevenue = webFacet.todayOrders[0]?.revenue ?? 0;
  const webYesterdayRevenue = webFacet.yesterdayOrders[0]?.revenue ?? 0;

  // ── Parse instagram KPI ──
  const instaFacet = instaResult[0];
  const instaKpi = {};
  for (const row of instaFacet.kpi)
    instaKpi[row._id] = { count: row.count, revenue: row.revenue };
  const instaOrders = instaKpi.PAID?.count ?? 0;
  const instaRevenue = instaKpi.PAID?.revenue ?? 0;
  const instaCreated = instaKpi.CREATED?.count ?? 0;

  // ── Combine web + insta recent orders, tag channel, sort by date ──
  const recentOrders = [
    ...webFacet.recentOrders.map((o) => ({ ...o, channel: "web" })),
    ...instaFacet.recentOrders.map((o) => ({ ...o, channel: "instagram" })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  // ── Insta today/yesterday ──
  const instaTodayCount = instaFacet.todayOrders[0]?.count ?? 0;
  const instaYesterdayCount = instaFacet.yesterdayOrders[0]?.count ?? 0;
  const instaTodayRevenue = instaFacet.todayOrders[0]?.revenue ?? 0;
  const instaYesterdayRevenue = instaFacet.yesterdayOrders[0]?.revenue ?? 0;

  // ── Compute trends ──
  function pctTrend(today, yesterday) {
    if (yesterday === 0) return null;
    const pct = Math.round(((today - yesterday) / yesterday) * 100);
    return { up: pct >= 0, percent: Math.abs(pct) };
  }
  const totalTodayOrders = webTodayCount + instaTodayCount;
  const totalYesterdayOrders = webYesterdayCount + instaYesterdayCount;
  const totalTodayRevenue = webTodayRevenue + instaTodayRevenue;
  const totalYesterdayRevenue = webYesterdayRevenue + instaYesterdayRevenue;

  // ── Merge 30-day chart data ──
  const chartMap = new Map();
  for (const d of webFacet.chart) {
    chartMap.set(d._id, {
      date: d._id,
      webOrders: d.webOrders,
      webRevenue: d.webRevenue,
      instaOrders: 0,
      instaRevenue: 0,
    });
  }
  for (const d of instaFacet.chart) {
    if (chartMap.has(d._id)) {
      const existing = chartMap.get(d._id);
      existing.instaOrders = d.instaOrders;
      existing.instaRevenue = d.instaRevenue;
    } else {
      chartMap.set(d._id, {
        date: d._id,
        webOrders: 0,
        webRevenue: 0,
        instaOrders: d.instaOrders,
        instaRevenue: d.instaRevenue,
      });
    }
  }
  const chart = Array.from(chartMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      orders: d.webOrders + d.instaOrders,
      revenue: d.webRevenue + d.instaRevenue,
      webOrders: d.webOrders,
      instaOrders: d.instaOrders,
    }));

  return res.status(200).json(
    new ApiResponse(200, "Dashboard stats fetched", {
      kpi: {
        totalOrders: webOrders + instaOrders,
        webOrders,
        instaOrders,
        webCreated,
        instaCreated,
        pending,
        totalRevenue: webRevenue + instaRevenue,
        webRevenue,
        instaRevenue,
        waitlist,
        // ── Trend vs yesterday ──
        ordersTrend: pctTrend(totalTodayOrders, totalYesterdayOrders),
        revenueTrend: pctTrend(totalTodayRevenue, totalYesterdayRevenue),
        webOrdersTrend: webTodayCount - webYesterdayCount,
        instaOrdersTrend: instaTodayCount - instaYesterdayCount,
      },
      channelSplit: { web: webOrders, insta: instaOrders },
      chart,
      recentOrders,
      latestProducts,
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

// GET /admin/users/:userId
// Returns name, email, mobileNumber for a website user. Read-only — no data is modified.
const getUserByUserId = async (req, res, next) => {
  try {
    const user = await User.findOne(
      { userId: req.params.userId },
      { name: 1, email: 1, mobileNumber: 1, _id: 0 },
    ).lean();
    if (!user) throw new ApiError(404, "User not found.");
    return res.status(200).json(new ApiResponse(200, "User fetched.", user));
  } catch (err) {
    next(err);
  }
};

export {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderTracking,
  getDashboardStats,
  streamOrders,
  getUserByUserId,
};
