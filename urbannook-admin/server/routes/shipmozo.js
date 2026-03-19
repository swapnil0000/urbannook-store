const express = require("express");
const router = express.Router();
const {
  pushOrderToCourier,
  getShipmentByOrderId,
  listWarehouses,
} = require("../controllers/shipmozo");

router.post("/push-order", pushOrderToCourier);
router.get("/shipment/:orderId", getShipmentByOrderId);
router.get("/warehouses", listWarehouses);

module.exports = router;
