const mongoose = require("mongoose");

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

module.exports = mongoose.model("ShipmentRecord", shipmentRecordSchema);
