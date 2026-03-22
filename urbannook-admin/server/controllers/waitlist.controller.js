import Waitlist from "../models/waitlist.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

const getWaitlistUsers = async (req, res) => {
  const { tab = "all", page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = tab === "sent"
    ? { waitListEmailSent: true }
    : tab === "pending"
    ? { waitListEmailSent: false }
    : {};

  const [users, total] = await Promise.all([
    Waitlist.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Waitlist.countDocuments(filter),
  ]);

  const [sentCount, pendingCount] = await Promise.all([
    Waitlist.countDocuments({ waitListEmailSent: true }),
    Waitlist.countDocuments({ waitListEmailSent: false }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Waitlist users fetched successfully", {
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      counts: { all: sentCount + pendingCount, sent: sentCount, pending: pendingCount },
    })
  );
};

export { getWaitlistUsers };
