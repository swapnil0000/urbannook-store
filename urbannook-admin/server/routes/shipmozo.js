import express from "express";
import {
  pushOrderToCourier,
  getShipmentByOrderId,
  listWarehouses,
  listShipments,
  getRatesForShipment,
  assignCourierToShipment,
  getLabelForShipment,
  trackShipment,
  cancelShipment,
  getShippedOrderIds,
  syncAllStatuses,
} from "../controllers/shipmozo.controller.js";

const router = express.Router();

// Phase 1 — push order flow (used by OrderDetailDrawer)
router.post("/push-order",           pushOrderToCourier);
router.get("/shipment/:orderId",     getShipmentByOrderId);  // singular — no conflict with /shipments
router.get("/warehouses",            listWarehouses);
router.get("/shipped-order-ids",     getShippedOrderIds);

// Phase 2 — Shipments dashboard
// NOTE: fixed paths MUST come before /:id wildcard routes
router.get("/shipments",                      listShipments);
router.post("/shipments/sync-statuses",       syncAllStatuses);  // fixed path — before /:id
router.get("/shipments/:id/rates",            getRatesForShipment);
router.post("/shipments/:id/assign",          assignCourierToShipment);
router.get("/shipments/:id/label",            getLabelForShipment);
router.get("/shipments/:id/track",            trackShipment);
router.post("/shipments/:id/cancel",          cancelShipment);

export default router;
