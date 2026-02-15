const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

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

  const adminAccessToken = jwt.sign(
    { email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res
    .status(200)
    .cookie("adminAccessToken", adminAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })
    .json(
      new ApiResponse(200, "Login successful", {
        userEmail: admin.email,
        adminAccessToken,
      })
    );
};

const logout = async (req, res) => {
  res
    .status(200)
    .clearCookie("adminAccessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })
    .json(new ApiResponse(200, "Logout successful"));
};

module.exports = { login, logout };
