import mongoose from "mongoose";

// Read-only model — maps to existing 'users' collection in prod DB
const userSchema = new mongoose.Schema(
  {
    userId: { type: String },
    name: { type: String },
    email: { type: String },
    mobileNumber: { type: mongoose.Schema.Types.Mixed }, // stored as Number in prod
  },
  { strict: false, collection: "users" }
);

userSchema.index({ userId: 1 });

export default mongoose.model("User", userSchema);
