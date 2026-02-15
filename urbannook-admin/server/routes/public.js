const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  getHomepageProducts,
} = require("../controllers/product");

// Public product routes (no auth middleware)
router.get("/products", getProducts);
router.get("/product/:productId", getProductById);
router.get("/products/homepage", getHomepageProducts);

module.exports = router;
