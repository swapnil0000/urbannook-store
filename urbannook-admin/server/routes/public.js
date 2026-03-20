import express from "express";
import {
  getProducts,
  getProductById,
  getHomepageProducts,
} from "../controllers/product.js";

const router = express.Router();

// Public product routes (no auth middleware)
router.get("/products", getProducts);
router.get("/product/:productId", getProductById);
router.get("/products/homepage", getHomepageProducts);

export default router;
