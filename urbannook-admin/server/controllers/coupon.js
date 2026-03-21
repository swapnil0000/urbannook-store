import { uuidv7 } from "uuidv7";
import Coupon from "../models/Coupon.js";
import { ApiResponse, ApiError } from "../utils/apiResponse.js";

const createCoupon = async (req, res) => {
  const { name, discountType, discountValue, maxDiscount, minCartValue, desc } = req.body;

  if (!name || !discountType || !discountValue) {
    throw new ApiError(400, "Name, discount type, and discount value are required");
  }

  if (discountType === "PERCENTAGE" && (discountValue < 1 || discountValue > 100)) {
    throw new ApiError(400, "Percentage must be between 1-100");
  }

  if (discountType === "PERCENTAGE" && !maxDiscount) {
    throw new ApiError(400, "Max discount is required for percentage coupons");
  }

  if (minCartValue && minCartValue < 100) {
    throw new ApiError(400, "Min cart value must be at least ₹100");
  }

  const existingCoupon = await Coupon.findOne({ name: name.toUpperCase() });
  if (existingCoupon) {
    throw new ApiError(400, "Coupon name already exists");
  }

  const couponCodeId = uuidv7();
  const coupon = await Coupon.create({
    name: name.toUpperCase(),
    couponCodeId,
    discountType,
    discountValue,
    maxDiscount: discountType === "PERCENTAGE" ? maxDiscount : null,
    minCartValue: minCartValue || 0,
    desc,
  });

  res.status(201).json(new ApiResponse(201, "Coupon created successfully", coupon));
};

const listCoupons = async (req, res) => {
  const { isPublished, search } = req.query;
  const filter = {};

  if (isPublished !== undefined) {
    filter.isPublished = isPublished === "true";
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const coupons = await Coupon.find(filter).lean().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, "Coupons fetched successfully", coupons));
};

const editCoupon = async (req, res) => {
  const { couponCodeId } = req.params;
  const { name, discountType, discountValue, maxDiscount, minCartValue, desc, isPublished } = req.body;

  if (discountType === "PERCENTAGE" && (discountValue < 1 || discountValue > 100)) {
    throw new ApiError(400, "Percentage must be between 1-100");
  }

  if (discountType === "PERCENTAGE" && !maxDiscount) {
    throw new ApiError(400, "Max discount is required for percentage coupons");
  }

  if (minCartValue && minCartValue < 100) {
    throw new ApiError(400, "Min cart value must be at least ₹100");
  }

  const updateData = {
    name: name?.toUpperCase(),
    discountType,
    discountValue,
    maxDiscount: discountType === "PERCENTAGE" ? maxDiscount : null,
    minCartValue,
    desc,
    isPublished,
  };

  const coupon = await Coupon.findOneAndUpdate(
    { couponCodeId },
    updateData,
    { new: true, runValidators: true }
  );

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  res.status(200).json(new ApiResponse(200, "Coupon updated successfully", coupon));
};

const togglePublish = async (req, res) => {
  const { couponCodeId } = req.params;

  const coupon = await Coupon.findOne({ couponCodeId });
  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  coupon.isPublished = !coupon.isPublished;
  await coupon.save();

  res.status(200).json(new ApiResponse(200, "Coupon status updated", coupon));
};

const deleteCoupon = async (req, res) => {
  const { couponCodeId } = req.params;

  const coupon = await Coupon.findOneAndDelete({ couponCodeId });
  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  res.status(200).json(new ApiResponse(200, "Coupon deleted successfully", coupon));
};

export {
  createCoupon,
  listCoupons,
  editCoupon,
  togglePublish,
  deleteCoupon,
};
