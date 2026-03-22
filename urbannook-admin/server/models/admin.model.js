import mongoose from "mongoose";
import bcrypt from "bcryptjs";

function generateAdminUid() {
  const ts  = Date.now().toString(36);                          // base36 timestamp
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5 random chars
  return `admin-${ts}-${rnd}`;
}

const adminSchema = new mongoose.Schema(
  {
    adminUid: { type: String, unique: true, sparse: true },   // cross-DB stable ID
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ["admin", "super_admin"], default: "admin" },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate adminUid on first save if missing
adminSchema.pre("save", async function (next) {
  if (!this.adminUid) this.adminUid = generateAdminUid();
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.isPasswordCorrect = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model("Admin", adminSchema);
