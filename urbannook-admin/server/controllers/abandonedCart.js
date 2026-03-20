import Cart from "../models/AbandonedCart.js";
import User from "../models/User.js";
import { ApiResponse } from "../utils/apiResponse.js";

// GET /admin/abandoned-carts
// Pure read — no writes to any collection
// Uses aggregation to avoid $nin on large paidUserIds array
export const getAbandonedCarts = async (req, res) => {
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
  const skip = (page - 1) * limit;

  // Aggregation pipeline:
  // 1. Only carts with non-empty products
  // 2. Left-join orders collection — keep only carts with NO paid order for that userId
  // 3. Sort, paginate
  const pipeline = [
    // Stage 1: non-empty products only
    { $match: { products: { $exists: true, $not: { $size: 0 } } } },

    // Stage 2: lookup paid orders for this userId
    {
      $lookup: {
        from: "orders",
        let: { uid: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$uid"] },
                  { $eq: ["$status", "PAID"] },
                ],
              },
            },
          },
          { $limit: 1 },          // we only need to know if one exists
          { $project: { _id: 1 } },
        ],
        as: "paidOrders",
      },
    },

    // Stage 3: keep only carts with zero paid orders
    { $match: { paidOrders: { $size: 0 } } },

    // Stage 4: drop the joined array — not needed in output
    { $project: { paidOrders: 0 } },
  ];

  // Run count + paginated fetch in parallel
  const [countResult, carts] = await Promise.all([
    Cart.aggregate([...pipeline, { $count: "total" }]),
    Cart.aggregate([
      ...pipeline,
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
  ]);

  const total = countResult[0]?.total ?? 0;

  // Enrich with user details — single read query
  const userIds = carts.map((c) => c.userId).filter(Boolean);

  const users = userIds.length
    ? await User.find(
        { userId: { $in: userIds } },
        { userId: 1, name: 1, email: 1, mobileNumber: 1 }
      ).lean()
    : [];

  const userMap = {};
  for (const u of users) {
    userMap[u.userId] = u;
  }

  const enriched = carts.map((cart) => {
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
