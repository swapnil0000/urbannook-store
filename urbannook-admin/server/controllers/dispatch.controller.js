import DispatchRecord from "../models/dispatch.record.model.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";

// POST /admin/dispatch/:orderId
// Idempotent — safe to call twice (upsert on orderId).
const markDispatched = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderType, notes } = req.body;

    if (!orderId?.trim())
      throw new ApiError(400, "orderId is required.");
    if (!["WEBSITE", "INSTAGRAM"].includes(orderType))
      throw new ApiError(400, "orderType must be WEBSITE or INSTAGRAM.");

    // $setOnInsert ensures the first write wins — re-dispatching the same order
    // doesn't overwrite the original timestamp or admin.
    const record = await DispatchRecord.findOneAndUpdate(
      { orderId },
      {
        $setOnInsert: {
          orderId,
          orderType,
          dispatchedAt: new Date(),
          dispatchedBy: req.admin?.email ?? null,
          notes:        notes?.trim() || null,
        },
      },
      { upsert: true, new: true },
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Order marked as dispatched.", record));
  } catch (err) {
    next(err);
  }
};

// GET /admin/dispatch/order-ids
// Returns a flat array of all dispatched orderIds.
// Used by the Orders page to set the button state for every row in one request.
const getDispatchedOrderIds = async (req, res, next) => {
  try {
    const records = await DispatchRecord.find({}, { orderId: 1, _id: 0 }).lean();
    const ids = records.map((r) => r.orderId);
    return res
      .status(200)
      .json(new ApiResponse(200, "Dispatched order IDs fetched.", ids));
  } catch (err) {
    next(err);
  }
};

export { markDispatched, getDispatchedOrderIds };
