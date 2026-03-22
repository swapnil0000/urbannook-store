import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import bcrypt from "bcryptjs";
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

// POST /admin/users/create — admin + super_admin can create a normal user
export const createUser = async (req, res, next) => {
  try {
    const { name, email, mobileNumber, password } = req.body;
    if (!name?.trim())  throw new ApiError(400, "Name is required");
    if (!email?.trim()) throw new ApiError(400, "Email is required");
    if (!password || password.length < 6) throw new ApiError(400, "Password must be at least 6 characters");

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) throw new ApiError(409, "A user with this email already exists");

    const { uuidv7 } = await import("uuidv7");
    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      userId: uuidv7(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber?.trim() || undefined,
      password: hashed,
      isSuspended: false,
    });

    res.status(201).json(new ApiResponse(201, "User created successfully", {
      userId: user.userId,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
    }));
  } catch (err) { next(err); }
};

// POST /admin/admins/create — super_admin only
export const createAdmin = async (req, res, next) => {
  try {
    const { email, password, role = "admin" } = req.body;
    if (!email?.trim())  throw new ApiError(400, "Email is required");
    if (!password || password.length < 6) throw new ApiError(400, "Password must be at least 6 characters");
    if (!["admin", "super_admin"].includes(role)) throw new ApiError(400, "Invalid role");

    const existing = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (existing) throw new ApiError(409, "An admin with this email already exists");

    const admin = await Admin.create({
      email: email.trim().toLowerCase(),
      password,
      role,
    });

    res.status(201).json(new ApiResponse(201, "Admin created successfully", {
      _id: admin._id,
      adminUid: admin.adminUid,
      email: admin.email,
      role: admin.role,
    }));
  } catch (err) { next(err); }
};
