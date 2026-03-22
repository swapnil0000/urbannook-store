import User from "../models/User.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";

// GET /admin/users — paginated user list with suspend status
export const listUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const search = req.query.search?.trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter, { password: 0, userRefreshToken: 0 })
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json(new ApiResponse(200, "Users fetched", {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }));
  } catch (err) { next(err); }
};

// PATCH /admin/users/:userId/suspend
export const suspendUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: { isSuspended: true } },
      { new: true }
    );
    if (!user) throw new ApiError(404, "User not found");
    res.json(new ApiResponse(200, "User suspended", { userId, isSuspended: true }));
  } catch (err) { next(err); }
};

// PATCH /admin/users/:userId/unsuspend
export const unsuspendUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: { isSuspended: false } },
      { new: true }
    );
    if (!user) throw new ApiError(404, "User not found");
    res.json(new ApiResponse(200, "User unsuspended", { userId, isSuspended: false }));
  } catch (err) { next(err); }
};
