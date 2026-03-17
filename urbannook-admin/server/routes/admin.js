const express = require("express");
const router = express.Router();
const multer = require("multer");
const { login, logout } = require("../controllers/auth");
const { verifyAuth } = require("../middleware/auth");
const {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product");
const { uploadImage, uploadMultipleImages } = require("../controllers/upload");
const { getWaitlistUsers } = require("../controllers/waitlist");
const { getAllOrders } = require("../controllers/order");
const {
  createCoupon,
  listCoupons,
  editCoupon,
  togglePublish,
  deleteCoupon,
} = require("../controllers/coupon");

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

// Wrap multer for Express 5 compatibility (multer uses callbacks, Express 5 needs promises)
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

// Protected order routes
router.get("/orders", verifyAuth, getAllOrders);

// Protected coupon routes
router.post("/coupon/create", verifyAuth, createCoupon);
router.get("/coupon/list", verifyAuth, listCoupons);
router.put("/coupon/edit/:couponCodeId", verifyAuth, editCoupon);
router.patch("/coupon/toggle/:couponCodeId", verifyAuth, togglePublish);
router.delete("/coupon/delete/:couponCodeId", verifyAuth, deleteCoupon);

module.exports = router;
