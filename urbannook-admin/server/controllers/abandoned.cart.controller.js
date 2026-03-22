import Cart from "../models/abandoned.cart.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

// GET /admin/abandoned-carts
// Case 1 (never_ordered): non-empty cart + user has NEVER placed a PAID order
// Case 2 (re_abandoned):  non-empty cart + cart.updatedAt > user's last PAID order
export const getAbandonedCarts = async (req, res) => {
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
  const skip = (page - 1) * limit;

  // Step 1: fetch all carts that have products (non-null, non-empty)
  const allCarts = await Cart.find({
    products: { $exists: true, $ne: null },
  })
    .sort({ updatedAt: -1 })
    .lean();

  // Filter out carts where products is empty array or empty object
  const nonEmptyCarts = allCarts.filter((cart) => {
    const p = cart.products;
    if (!p) return false;
    if (Array.isArray(p)) return p.length > 0;
    if (typeof p === "object") return Object.keys(p).length > 0;
    return false;
  });

  if (nonEmptyCarts.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "Carts fetched", {
        carts: [],
        pagination: { currentPage: page, totalPages: 0, total: 0, limit },
      })
    );
  }

  // Step 2: get all unique userIds from these carts
  const userIds = [...new Set(nonEmptyCarts.map((c) => c.userId).filter(Boolean))];

  // Step 3: for each userId, find their last PAID order
  const paidOrders = await Order.find(
    { userId: { $in: userIds }, status: "PAID" },
    { userId: 1, createdAt: 1 }
  )
    .sort({ createdAt: -1 })
    .lean();

  // Build map: userId -> most recent PAID order createdAt
  const lastPaidMap = {};
  for (const o of paidOrders) {
    if (!lastPaidMap[o.userId]) {
      lastPaidMap[o.userId] = o.createdAt;
    }
  }

  // Step 4: classify each cart
  const classified = nonEmptyCarts
    .map((cart) => {
      const lastPaid = lastPaidMap[cart.userId];
      if (!lastPaid) {
        return { ...cart, cartCase: "never_ordered" };
      }
      // re-abandoned: cart was updated AFTER their last paid order
      if (cart.updatedAt > lastPaid) {
        return { ...cart, cartCase: "re_abandoned" };
      }
      // cart is older than last paid order — not abandoned, skip
      return null;
    })
    .filter(Boolean);

  const total = classified.length;
  const paginated = classified.slice(skip, skip + limit);

  // Step 5: enrich with user info
  const pageUserIds = [...new Set(paginated.map((c) => c.userId).filter(Boolean))];
  const users = pageUserIds.length
    ? await User.find(
        { userId: { $in: pageUserIds } },
        { userId: 1, name: 1, email: 1, mobileNumber: 1 }
      ).lean()
    : [];

  const userMap = {};
  for (const u of users) userMap[u.userId] = u;

  const enriched = paginated.map((cart) => {
    const u = userMap[cart.userId] || {};
    return {
      ...cart,
      userInfo: {
        name: u.name || null,
        email: u.email || null,
        phone: u.mobileNumber ? String(u.mobileNumber) : null,
      },
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Carts fetched", {
      carts: enriched,
      pagination: {
        currentPage: page,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        total,
        limit,
      },
    })
  );
};
