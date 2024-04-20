const express = require("express");
const router = express.Router();
const orderController = require("../app/controllers/orders.controller");

router.post("/placeOrder", orderController.placeOrderAndSendMessage);
router.get("/getOrderByUser/:userName", orderController.getOrderByUserName);
router.get("/getOrderByOrderId/:orderId", orderController.getOrderByOrderId);
router.post("/getAllOrders", orderController.getAllOrdersByAdmin);

module.exports = router;
