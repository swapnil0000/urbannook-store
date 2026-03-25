import express from "express";
import multer from "multer";
import { login, logout } from "../controllers/auth.controller.js";
import { verifyAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { uploadImage, uploadMultipleImages } from "../controllers/upload.controller.js";
import { getWaitlistUsers } from "../controllers/waitlist.controller.js";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderTracking,
  getDashboardStats,
  streamOrders,
  getUserByUserId,
} from "../controllers/order.controller.js";
import {
  getAllInstagramOrders,
  createInstagramOrder,
  updateInstagramOrder,
  streamInstagramOrders,
} from "../controllers/instagram.order.controller.js";
import {
  createCoupon,
  listCoupons,
  editCoupon,
  togglePublish,
  deleteCoupon,
} from "../controllers/coupon.controller.js";
import { getEnv, switchEnv } from "../controllers/env.switch.controller.js";
import { getAbandonedCarts } from "../controllers/abandoned.cart.controller.js";
import {
  getAllTestimonials,
  approveTestimonial,
  declineTestimonial,
} from "../controllers/testimonial.controller.js";
import {
  listAdmins,
  changeAdminRole,
  getPermissions,
  updatePermission,
  getMyPermissions,
  changeAdminPassword,
  suspendAdmin,
  unsuspendAdmin,
} from "../controllers/admin.management.controller.js";
import {
  listUsers,
  suspendUser,
  unsuspendUser,
  createUser,
  createAdmin,
} from "../controllers/user.management.controller.js";
import {
  initiateDelete,
  listPendingApprovals,
  approveDelete,
  rejectDelete,
} from "../controllers/delete.approval.controller.js";
import shipmozoRoutes from "./shipmozo.js";
import { markDispatched, getDispatchedOrderIds } from "../controllers/dispatch.controller.js";
import { getPaidOrders, getFulfillmentData, confirmDispatch, togglePriority } from "../controllers/management.controller.js";

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

// Management
router.get("/management/orders",                         auth, requirePermission("orders", "read"),  getPaidOrders);
router.get("/management/fulfillment",                    auth, requirePermission("orders", "read"),  getFulfillmentData);
router.post("/management/confirm-dispatch/:shipmentId",  auth, requirePermission("orders", "write"), confirmDispatch);
router.patch("/management/priority/:orderId",            auth, requirePermission("orders", "write"), togglePriority);

// Dispatch — admin marks a parcel as handed to courier for pickup
router.get("/dispatch/order-ids", auth, requirePermission("orders", "read"),  getDispatchedOrderIds);
router.post("/dispatch/:orderId",  auth, requirePermission("orders", "write"), markDispatched);

// Admin management — super_admin only
router.get("/admins",                auth, requirePermission("users", "read"),   listAdmins);
router.patch("/admins/:id/role",     auth, requirePermission("users", "delete"), changeAdminRole);
router.patch("/admins/me/password",   auth, changeAdminPassword);
router.patch("/admins/:id/password",  auth, changeAdminPassword);
router.patch("/admins/:id/suspend",  auth, requirePermission("users", "delete"), suspendAdmin);
router.patch("/admins/:id/unsuspend",auth, requirePermission("users", "delete"), unsuspendAdmin);
router.get("/permissions",           auth, requirePermission("users", "read"),   getPermissions);
router.patch("/permissions",         auth, requirePermission("users", "delete"), updatePermission);
router.get("/my-permissions",        auth, getMyPermissions);

// User management
router.get("/users",                          auth, requirePermission("users", "read"),   listUsers);
router.post("/users/create",                  auth, requirePermission("users", "write"),  createUser);
router.patch("/users/:userId/suspend",        auth, requirePermission("users", "delete"), suspendUser);
router.patch("/users/:userId/unsuspend",      auth, requirePermission("users", "delete"), unsuspendUser);

// Admin creation — super_admin only (uses "delete" bit as it's a privileged write)
router.post("/admins/create",                 auth, requirePermission("users", "delete"), createAdmin);

// Delete approvals (prod env — 2 super_admin required)
router.post("/delete-approvals",              auth, requirePermission("products", "delete"), initiateDelete);
router.get("/delete-approvals",               auth, requirePermission("products", "delete"), listPendingApprovals);
router.patch("/delete-approvals/:id/approve", auth, requirePermission("products", "delete"), approveDelete);
router.patch("/delete-approvals/:id/reject",  auth, requirePermission("products", "delete"), rejectDelete);

export default router;
