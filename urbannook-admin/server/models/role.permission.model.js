import mongoose from "mongoose";

const rolePermissionSchema = new mongoose.Schema(
  {
    adminUid: { type: String, required: true, unique: true }, // e.g. "admin-lx3k2a-AB12C"
    role:     { type: String, required: true },
    resources: {
      products:         { type: Number, default: 0, min: 0, max: 7 },
      orders:           { type: Number, default: 0, min: 0, max: 7 },
      users:            { type: Number, default: 0, min: 0, max: 7 },
      coupons:          { type: Number, default: 0, min: 0, max: 7 },
      shipments:        { type: Number, default: 0, min: 0, max: 7 },
      testimonials:     { type: Number, default: 0, min: 0, max: 7 },
      waitlist:         { type: Number, default: 0, min: 0, max: 7 },
      instagram_orders: { type: Number, default: 0, min: 0, max: 7 },
      abandoned_carts:  { type: Number, default: 0, min: 0, max: 7 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("RolePermission", rolePermissionSchema);
