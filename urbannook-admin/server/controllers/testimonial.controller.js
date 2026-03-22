import Testimonial from "../models/testimonial.model.js";

// GET /admin/testimonials — all testimonials
export const getAllTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/testimonials/:id/approve
export const approveTestimonial = async (req, res, next) => {
  try {
    const doc = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/testimonials/:id/decline
export const declineTestimonial = async (req, res, next) => {
  try {
    const doc = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { isApproved: false },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// GET /testimonials — public, only approved
export const getApprovedTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({ isApproved: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    next(err);
  }
};
