import express from "express";
import multer from "multer";
import { login, logout } from "../controllers/auth.js";
import { verifyAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
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
  getUserByUserId,
} from "../controllers/order.js";
import {
  getAllInstagramOrders,
  createInstagramOrder,
  updateInstagramOrder,
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
import {
  getAllTestimonials,
  approveTestimonial,
  declineTestimonial,
} from "../controllers/testimonial.js";
import {
  listAdmins,
  changeAdminRole,
  getPermissions,
  updatePermission,
  getMyPermissions,
  changeAdminPassword,
  suspendAdmin,
  unsuspendAdmin,
} from "../controllers/adminManagement.js";
import {
  listUsers,
  suspendUser,
  unsuspendUser,
} from "../controllers/userManagement.js";
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

const auth = verifyAuth; // shorthand

// Public auth routes
router.post("/login", login);
router.post("/logout", auth, logout);

// Upload
router.post("/upload/image",  auth, requirePermission("products", "write"), multerSingle("image"), uploadImage);
router.post("/upload/images", auth, requirePermission("products", "write"), multerArray("images", 10), uploadMultipleImages);

// Products — admin: rwx (7), super_admin: rwx (7)
router.get("/total/products",                auth, requirePermission("products", "read"),   getAllProducts);
router.post("/add/inventory",                auth, requirePermission("products", "write"),  addProduct);
router.post("/update/inventory/:productId",  auth, requirePermission("products", "write"),  updateProduct);
router.delete("/delete/inventory/:productId",auth, requirePermission("products", "delete"), deleteProduct);

router.get("/joined/waitlist", auth, requirePermission("waitlist", "read"), getWaitlistUsers);

// Env switcher
router.get("/env",         auth, getEnv);
router.post("/env/switch", auth, switchEnv);

// Dashboard
router.get("/dashboard/stats", auth, getDashboardStats);

router.get("/abandoned-carts", auth, requirePermission("abandoned_carts", "read"), getAbandonedCarts);

router.get("/orders/stream",           auth, requirePermission("orders", "read"),  streamOrders);
router.get("/orders/instagram/stream", auth, requirePermission("instagram_orders", "read"),  streamInstagramOrders);
router.get("/orders/instagram",        auth, requirePermission("instagram_orders", "read"),  getAllInstagramOrders);
router.post("/orders/instagram",       auth, requirePermission("instagram_orders", "write"), createInstagramOrder);
router.put("/orders/instagram/:orderId",auth, requirePermission("instagram_orders", "write"), updateInstagramOrder);
router.get("/orders",                  auth, requirePermission("orders", "read"),  getAllOrders);
router.get("/orders/:orderId",         auth, requirePermission("orders", "read"),  getOrderById);
router.get("/users/:userId",           auth, requirePermission("users",  "read"),  getUserByUserId);
router.patch("/orders/:orderId/status",  auth, requirePermission("orders", "write"), updateOrderStatus);
router.patch("/orders/:orderId/tracking",auth, requirePermission("orders", "write"), updateOrderTracking);

// Coupons — admin: rwx (7), super_admin: rwx (7)
router.post("/coupon/create",              auth, requirePermission("coupons", "write"),  createCoupon);
router.get("/coupon/list",                 auth, requirePermission("coupons", "read"),   listCoupons);
router.put("/coupon/edit/:couponCodeId",   auth, requirePermission("coupons", "write"),  editCoupon);
router.patch("/coupon/toggle/:couponCodeId",auth, requirePermission("coupons", "write"), togglePublish);
router.delete("/coupon/delete/:couponCodeId",auth, requirePermission("coupons", "delete"), deleteCoupon);

router.get("/testimonials",          auth, requirePermission("testimonials", "read"),  getAllTestimonials);
router.patch("/testimonials/:id/approve", auth, requirePermission("testimonials", "write"), approveTestimonial);
router.patch("/testimonials/:id/decline", auth, requirePermission("testimonials", "write"), declineTestimonial);

// Shipmozo
router.use("/shipmozo", auth, shipmozoRoutes);

// Admin management — super_admin only
router.get("/admins",                auth, requirePermission("users", "read"),   listAdmins);
router.patch("/admins/:id/role",     auth, requirePermission("users", "delete"), changeAdminRole);
router.patch("/admins/:id/password", auth, requirePermission("users", "delete"), changeAdminPassword);
router.patch("/admins/:id/suspend",  auth, requirePermission("users", "delete"), suspendAdmin);
router.patch("/admins/:id/unsuspend",auth, requirePermission("users", "delete"), unsuspendAdmin);
router.get("/permissions",           auth, requirePermission("users", "read"),   getPermissions);
router.patch("/permissions",         auth, requirePermission("users", "delete"), updatePermission);
router.get("/my-permissions",        auth, getMyPermissions);

// User management
router.get("/users",                          auth, requirePermission("users", "read"),   listUsers);
router.patch("/users/:userId/suspend",        auth, requirePermission("users", "delete"), suspendUser);
router.patch("/users/:userId/unsuspend",      auth, requirePermission("users", "delete"), unsuspendUser);

export default router;
