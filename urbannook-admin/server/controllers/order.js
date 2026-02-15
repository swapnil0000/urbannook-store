const Order = require("../models/Order");
const { ApiResponse } = require("../utils/apiResponse");

const getAllOrders = async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, "Orders fetched successfully", orders)
  );
};

module.exports = { getAllOrders };
