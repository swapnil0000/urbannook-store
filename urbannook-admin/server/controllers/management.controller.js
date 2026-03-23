import Order from "../models/order.model.js";
import InstagramOrder from "../models/instagram.order.model.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

// GET /admin/management/orders
// Returns paginated PAID orders from both Website + Instagram collections,
// merged and sorted newest-first. Enriches website orders with customer name.
const getPaidOrders = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));

    // Fetch PAID from both collections in parallel — only the fields we need
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

    // Bulk-fetch user names for website orders (avoid N+1)
    const userIds = [...new Set(webOrders.map((o) => o.userId).filter(Boolean))];
    const users =
      userIds.length > 0
        ? await User.find(
            { userId: { $in: userIds } },
            { userId: 1, name: 1 },
          ).lean()
        : [];
    const userMap = Object.fromEntries(users.map((u) => [u.userId, u.name]));

    // Normalize to a flat shape
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

    // Sort newest-first
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

export { getPaidOrders };
