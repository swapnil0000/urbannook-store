import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    userName:   { type: String, required: true },
    content:    { type: String, required: true },
    rating:     { type: Number, min: 1, max: 5 },
    colorTheme: { type: String },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

testimonialSchema.index({ isApproved: 1, createdAt: -1 });

export default mongoose.model("Testimonial", testimonialSchema);
