import Waitlist from "../models/Waitlist.js";
import { ApiResponse } from "../utils/apiResponse.js";

const getWaitlistUsers = async (req, res) => {
  const users = await Waitlist.find();
  const totalJoinedUserWaitList = await Waitlist.countDocuments();

  return res.status(200).json(
    new ApiResponse(200, "Waitlist users fetched successfully", {
      users,
      totalJoinedUserWaitList,
    })
  );
};

export { getWaitlistUsers };
