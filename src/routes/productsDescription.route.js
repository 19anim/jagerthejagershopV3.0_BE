const express = require("express");
const router = express.Router();
const productsDescriptionController = require("../app/controllers/productsDescription.controller");
const requireAdmin = require("../middlewares/requireAdmin.middleware");

router.post("/create", requireAdmin, productsDescriptionController.addDescription);
router.get(
  "/getAllProductDescriptions",
  productsDescriptionController.getAllDescription
);
router.put("/:descriptionId", requireAdmin, productsDescriptionController.editDescription);
router.delete("/:descriptionId", requireAdmin, productsDescriptionController.deleteDescription);

module.exports = router;
