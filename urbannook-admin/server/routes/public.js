import express from "express";
import {
  getProducts,
  getProductById,
  getHomepageProducts,
} from "../controllers/product.js";
import { getApprovedTestimonials } from "../controllers/testimonial.js";

const router = express.Router();

// Public product routes (no auth middleware)
router.get("/products", getProducts);
router.get("/product/:productId", getProductById);
router.get("/products/homepage", getHomepageProducts);

// Public testimonials (approved only)
router.get("/testimonials", getApprovedTestimonials);

export default router;
