import Cart from "../models/AbandonedCart.js";
import User from "../models/User.js";
import { ApiResponse } from "../utils/apiResponse.js";

// GET /admin/abandoned-carts
// Case 1 (never_ordered): non-empty cart + user has NEVER placed a PAID order
// Case 2 (re_abandoned):  non-empty cart + cart.updatedAt > user's last PAID order createdAt
export const getAbandonedCarts = async (req, res) => {
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
  const skip = (page - 1) * limit;

  const pipeline = [
    // Stage 1: non-empty products only
    {
      $match: { products: { $exists: true, $not: { $size: 0 } } },
    },

    // Stage 2: lookup the user's most recent PAID order
    // NOTE: use $$uid (double-dollar) to reference the let variable
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
                  { $eq: ["$paymentStatus", "PAID"] },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { _id: 0, createdAt: 1 } },
        ],
        as: "lastPaidOrder",
      },
    },

    // Stage 3: keep cart if:
    //   - user has NO paid order ever (case 1), OR
    //   - cart updatedAt is AFTER their last paid order (case 2)
    {
      $match: {
        $expr: {
          $or: [
            { $eq: [{ $size: "$lastPaidOrder" }, 0] },
            {
              $gt: [
                "$updatedAt",
                { $arrayElemAt: ["$lastPaidOrder.createdAt", 0] },
              ],
            },
          ],
        },
      },
    },

    // Stage 4: tag each cart with which case it belongs to
    {
      $addFields: {
        cartCase: {
          $cond: {
            if: { $eq: [{ $size: "$lastPaidOrder" }, 0] },
            then: "never_ordered",
            else: "re_abandoned",
          },
        },
      },
    },

    // Stage 5: drop the joined array
    { $project: { lastPaidOrder: 0 } },
  ];

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

  const userIds = carts.map((c) => c.userId).filter(Boolean);
  const users = userIds.length
    ? await User.find(
        { userId: { $in: userIds } },
        { userId: 1, name: 1, email: 1, mobileNumber: 1 }
      ).lean()
    : [];

  const userMap = {};
  for (const u of users) userMap[u.userId] = u;

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
