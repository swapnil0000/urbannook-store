import express from "express";
import multer from "multer";
import { login, logout } from "../controllers/auth.js";
import { verifyAuth } from "../middleware/auth.js";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.js";
import { uploadImage, uploadMultipleImages } from "../controllers/upload.js";
import { getWaitlistUsers } from "../controllers/waitlist.js";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderTracking,
  getDashboardStats,
  streamOrders,
} from "../controllers/order.js";
import {
  getAllInstagramOrders,
  createInstagramOrder,
  streamInstagramOrders,
} from "../controllers/instagramOrder.js";
import {
  createCoupon,
  listCoupons,
  editCoupon,
  togglePublish,
  deleteCoupon,
} from "../controllers/coupon.js";
import { getEnv, switchEnv } from "../controllers/envSwitch.js";
import { getAbandonedCarts } from "../controllers/abandonedCart.js";
import shipmozoRoutes from "./shipmozo.js";

const router = express.Router();

// Multer config — store in memory, max 5MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Wrap multer for Express 5 compatibility
function multerSingle(fieldName) {
  return (req, res, next) => {
    return new Promise((resolve, reject) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    }).then(() => next()).catch(next);
  };
}

function multerArray(fieldName, maxCount) {
  return (req, res, next) => {
    return new Promise((resolve, reject) => {
      upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    }).then(() => next()).catch(next);
  };
}

// Public auth routes
router.post("/login", login);

// Protected auth routes
router.post("/logout", verifyAuth, logout);

// Protected upload routes
router.post("/upload/image", verifyAuth, multerSingle("image"), uploadImage);
router.post("/upload/images", verifyAuth, multerArray("images", 10), uploadMultipleImages);

// Protected product routes
router.get("/total/products", verifyAuth, getAllProducts);
router.post("/add/inventory", verifyAuth, addProduct);
router.post("/update/inventory/:productId", verifyAuth, updateProduct);
router.delete("/delete/inventory/:productId", verifyAuth, deleteProduct);

// Protected waitlist routes
router.get("/joined/waitlist", verifyAuth, getWaitlistUsers);

// Env switcher
router.get("/env", verifyAuth, getEnv);
router.post("/env/switch", verifyAuth, switchEnv);

// Dashboard stats
router.get("/dashboard/stats", verifyAuth, getDashboardStats);

// Abandoned carts
router.get("/abandoned-carts", verifyAuth, getAbandonedCarts);

// Protected order routes — specific paths before wildcard /:orderId
router.get("/orders/stream", verifyAuth, streamOrders);
router.get("/orders/instagram/stream", verifyAuth, streamInstagramOrders);
router.get("/orders/instagram", verifyAuth, getAllInstagramOrders);
router.post("/orders/instagram", verifyAuth, createInstagramOrder);
router.get("/orders", verifyAuth, getAllOrders);
router.get("/orders/:orderId", verifyAuth, getOrderById);
router.patch("/orders/:orderId/status", verifyAuth, updateOrderStatus);
router.patch("/orders/:orderId/tracking", verifyAuth, updateOrderTracking);

// Protected coupon routes
router.post("/coupon/create", verifyAuth, createCoupon);
router.get("/coupon/list", verifyAuth, listCoupons);
router.put("/coupon/edit/:couponCodeId", verifyAuth, editCoupon);
router.patch("/coupon/toggle/:couponCodeId", verifyAuth, togglePublish);
router.delete("/coupon/delete/:couponCodeId", verifyAuth, deleteCoupon);

// Shipmozo shipping routes
router.use("/shipmozo", verifyAuth, shipmozoRoutes);

export default router;
