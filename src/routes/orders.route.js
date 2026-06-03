const express = require("express");
const router = express.Router();
const orderController = require("../app/controllers/orders.controller");
const requireAdmin = require("../middlewares/requireAdmin.middleware");
const authenticateSession = require("../middlewares/authenticateSession.middleware");
const optionalSession = require("../middlewares/optionalSession.middleware");

router.post("/placeOrder", optionalSession, orderController.placeOrderAndSendMessage);
router.get("/getOrderByUser/:userName", authenticateSession, orderController.getOrderByUserName);
router.get("/getOrderByOrderId/:orderId", authenticateSession, orderController.getOrderByOrderId);
router.post("/getAllOrders", requireAdmin, orderController.getAllOrdersByAdmin);
router.put("/:orderId/status", requireAdmin, orderController.updateOrderStatusByAdmin);

module.exports = router;
