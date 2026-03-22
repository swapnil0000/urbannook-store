import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";
import { cookieOptions } from "../config/cookieOptions.js";

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(401, "Email and password are required");
  }

  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (admin.isSuspended) {
    throw new ApiError(403, "Account suspended by super admin");
  }

  const adminAccessToken = jwt.sign(
    { adminUid: admin.adminUid, email: admin.email, role: admin.role ?? "admin" },
    process.env.ADMIN_ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );

  res
    .status(200)
    .cookie("adminAccessToken", adminAccessToken, cookieOptions)
    .json(
      new ApiResponse(200, "Login successful", {
        userEmail: admin.email,
        role: admin.role ?? "admin",
        adminAccessToken,
      })
    );
};

const logout = async (req, res) => {
  res
    .status(200)
    .clearCookie("adminAccessToken", cookieOptions)
    .json(new ApiResponse(200, "Logout successful"));
};

export { login, logout };
