const express = require("express");
const deliveryController = require("../app/controllers/delivery.controller");

const router = express.Router();

router.post("/estimate", deliveryController.estimate);

module.exports = router;
