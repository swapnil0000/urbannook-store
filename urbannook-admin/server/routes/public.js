import express from "express";
import {
  getProducts,
  getProductById,
  getHomepageProducts,
} from "../controllers/product.controller.js";
import { getApprovedTestimonials } from "../controllers/testimonial.controller.js";
import {
  getCheckoutOrder,
  initiateCheckoutPayment,
  verifyCheckoutPayment,
} from "../controllers/igCheckout.controller.js";

const router = express.Router();

// Public product routes (no auth middleware)
router.get("/products", getProducts);
router.get("/product/:productId", getProductById);
router.get("/products/homepage", getHomepageProducts);

// Public testimonials (approved only)
router.get("/testimonials", getApprovedTestimonials);

// Instagram checkout — called by the store's /ig-checkout/:orderId page
router.get("/ig-checkout/:orderId",        getCheckoutOrder);
router.post("/ig-checkout/:orderId/pay",   initiateCheckoutPayment);
router.post("/ig-checkout/:orderId/verify", verifyCheckoutPayment);

export default router;
