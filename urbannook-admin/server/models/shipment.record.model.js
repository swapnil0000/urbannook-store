import mongoose from "mongoose";

const trackingEventSchema = new mongoose.Schema(
  {
    scanStatus: { type: String },
    scanLocation: { type: String },
    scanDateTime: { type: Date },
    remarks: { type: String },
  },
  { _id: false },
);

const shipmentRecordSchema = new mongoose.Schema(
  {
    sourceOrderId: { type: String, required: true, unique: true },
    sourceOrderType: {
      type: String,
      required: true,
      enum: ["WEBSITE", "INSTAGRAM"],
    },
    warehouseId: { type: String, required: true },
    paymentType: {
      type: String,
      required: true,
      enum: ["PREPAID", "COD"],
    },
    weight: { type: Number, required: true }, // grams
    length: { type: Number, required: true }, // cm
    width: { type: Number, required: true },  // cm
    height: { type: Number, required: true }, // cm
    shipmentStatus: {
      type: String,
      required: true,
      enum: [
        "PUSHED",
        "ASSIGNED",
        "PICKUP_SCHEDULED",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RTO_INITIATED",
        "RTO_DELIVERED",
        "EXCEPTION",
      ],
      default: "PUSHED",
    },
    // Pincodes captured at push time — required for Rate Calculator API
    deliveryPincode: { type: String, default: null }, // consignee 6-digit pincode
    pickupPincode:   { type: String, default: null }, // warehouse pincode
    // Shipmozo's own generated order_id (returned as data.order_id in push-order response).
    // Our UUID is demoted to data.refrence_id (Shipmozo typo) and cannot be used for
    // subsequent API calls (assign-courier, rate-calculator, cancel-order).
    shipmozoOrderId: { type: String, default: null },
    // Populated in later phases
    awbNumber: { type: String, default: null },
    courierCompany: { type: String, default: null },
    courierService: { type: String, default: null },
    labelBase64: { type: String, default: null },
    isCancelled: { type: Boolean, default: false },
    trackingHistory: { type: [trackingEventSchema], default: [] },
    expectedDeliveryDate: { type: Date, default: null },
    lastTrackedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// sourceOrderId index is created by { unique: true } on the field — no duplicate needed
shipmentRecordSchema.index({ awbNumber: 1 }, { sparse: true });
shipmentRecordSchema.index({ isCancelled: 1, shipmentStatus: 1 });

export default mongoose.model("ShipmentRecord", shipmentRecordSchema);
