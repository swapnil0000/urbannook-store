const Order = require("../models/Order");
const { ApiResponse } = require("../utils/apiResponse");
const orderEventEmitter = require("../utils/orderEvents");

// Whitelisted sort fields — prevents arbitrary field injection
const ALLOWED_SORT_FIELDS = new Set(["createdAt", "amount"]);

// Valid statuses from the Order schema enum
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

//   GET /admin/orders/stream  (Server-Sent Events)
// Keeps an HTTP connection open and pushes new orders to the client as they
// arrive via the Change Stream → orderEventEmitter pipeline.
//
// Why SSE over WebSocket:
//   • Plain HTTP — no upgrade handshake, no protocol switch
//   • Browser EventSource auto-reconnects on drop with no extra code
//   • Credentials (cookies) are sent automatically — no manual token plumbing
//   • One-directional by design: server → client only
const streamOrders = (req, res) => {
  //   SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Prevent nginx / proxies from buffering the stream
    "X-Accel-Buffering": "no",
  });

  // Flush initial bytes so the browser opens the stream immediately
  res.write(":\n\n");

  //   Heartbeat
  // Send a comment line every 25 seconds to keep the connection alive through
  // proxies/load-balancers that would otherwise close idle connections
  const heartbeat = setInterval(() => {
    // SSE comment syntax — browsers silently ignore this
    res.write(":\n\n");
  }, 25_000);

  //   Forward new orders to this SSE client
  const sendOrder = (order) => {
    try {
      res.write(`event: new_order\ndata: ${JSON.stringify(order)}\n\n`);
    } catch {
      // Client disconnected between the heartbeat and this write — cleanup runs below
    }
  };

  orderEventEmitter.on("new_order", sendOrder);
  console.log(`[SSE] Client connected (${req.admin?.email ?? "unknown"})`);

  //   Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    orderEventEmitter.off("new_order", sendOrder);
    console.log(`[SSE] Client disconnected (${req.admin?.email ?? "unknown"})`);
  });
};

module.exports = { getAllOrders, streamOrders };
