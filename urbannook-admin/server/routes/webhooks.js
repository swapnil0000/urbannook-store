import express from "express";
import { razorpayWebhook } from "../controllers/webhooks.js";

const router = express.Router();

// Raw body is required for HMAC signature verification.
// express.raw() is applied here (not in index.js) so only this route gets it.
router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhook,
);

export default router;
