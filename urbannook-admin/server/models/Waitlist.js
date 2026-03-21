import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    userName:          { type: String, required: true },
    userEmail:         { type: String, required: true, unique: true },
    waitListEmailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Waitlist", waitlistSchema, "userwaistlists");
