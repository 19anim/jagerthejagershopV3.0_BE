const express = require("express");
const router = express.Router();
const settingsController = require("../app/controllers/settings.controller");
const requireAdmin = require("../middlewares/requireAdmin.middleware");

router.get("/shop3d", settingsController.getShop3dTheme);
router.put("/shop3d", requireAdmin, settingsController.setShop3dTheme);

module.exports = router;
