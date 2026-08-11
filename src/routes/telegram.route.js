const express = require("express");
const router = express.Router();
const telegramController = require("../app/controllers/telegram.controller");
const requireAdmin = require("../middlewares/requireAdmin.middleware");

router.post("/generateLinkCode", requireAdmin, telegramController.generateLinkCode);
router.post("/webhook", telegramController.webhook);

module.exports = router;
