import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";

const verifyAuth = async (req, res, next) => {
  const token =
    req.cookies?.adminAccessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      statusCode: 401,
      message: "Authentication token missing",
      data: null,
      success: false,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_ACCESS_TOKEN_SECRET);

    // Check if admin is suspended (re-query DB so it's always fresh)
    // Skip the DB check for env/switch itself — the DB is mid-transition
    const isEnvSwitch = req.path === "/env/switch";
    if (!isEnvSwitch) {
      const admin = await Admin.findOne({ email: decoded.email }, { isSuspended: 1, role: 1 }).lean();
      if (admin?.isSuspended) {
        return res.status(403).json({
          statusCode: 403,
          message: "Account suspended by super admin",
          data: null,
          success: false,
        });
      }
      // Always use role from current DB — JWT role may be stale after env switch
      if (admin?.role) decoded.role = admin.role;
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      statusCode: 401,
      message: "Authentication token missing",
      data: null,
      success: false,
    });
  }
};

export { verifyAuth };
