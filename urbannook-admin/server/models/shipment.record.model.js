import mongoose from "mongoose";
import { randomBytes } from "crypto";

function generateShipmentRefId() {
  return "SHP-" + randomBytes(4).toString("hex").toUpperCase();
}

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
    // Unique reference ID per push attempt — e.g. "SHP-A3F2C1D9"
    shipmentRefId: {
      type: String,
      unique: true,
      default: generateShipmentRefId,
    },
    sourceOrderId: { type: String, required: true },
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
    // Shipmozo's generated order_id (data.order_id in push-order response).
    // This is the ID used for ALL subsequent Shipmozo API calls (assign, rate, cancel).
    shipmozoOrderId: { type: String, default: null },
    // What we sent as order_id, echoed back as data.refrence_id (Shipmozo typo).
    // e.g. "IG-0016" for Instagram or "WS-5cd9004b6a23" for website orders.
    shipmozoRefId: { type: String, default: null },
    // Populated in later phases
    awbNumber: { type: String, default: null },
    courierCompany: { type: String, default: null },
    courierService: { type: String, default: null },
    labelBase64: { type: String, default: null },
    isCancelled: { type: Boolean, default: false },
    trackingHistory: { type: [trackingEventSchema], default: [] },
    expectedDeliveryDate: { type: Date, default: null },
    lastTrackedAt: { type: Date, default: null },
    // Set once when courier confirms pickup — used for idempotent email trigger
    dispatchConfirmedAt:  { type: Date, default: null },
    // Set once when shipment moves to IN_TRANSIT — prevents duplicate transit emails
    transitEmailSentAt:   { type: Date, default: null },
    // Set once when shipment is DELIVERED — prevents duplicate delivered emails
    deliveredEmailSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// No unique index on sourceOrderId — multiple records per order are allowed
// (one per push attempt). The duplicate check in the controller blocks re-push
// only when an active (non-cancelled) record exists.
shipmentRecordSchema.index({ sourceOrderId: 1 });
shipmentRecordSchema.index({ awbNumber: 1 }, { sparse: true });
shipmentRecordSchema.index({ isCancelled: 1, shipmentStatus: 1 });

export default mongoose.model("ShipmentRecord", shipmentRecordSchema);
