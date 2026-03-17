const jwt = require("jsonwebtoken");

const verifyAuth = (req, res, next) => {
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

module.exports = { verifyAuth };
