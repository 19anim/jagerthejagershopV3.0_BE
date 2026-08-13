const express = require("express");
const router = express.Router();
const assetsController = require("../app/controllers/assets.controller");
const requireAdmin = require("../middlewares/requireAdmin.middleware");
const { uploadAssetFile } = require("../middlewares/assetUpload.middleware");

router.get("/", requireAdmin, assetsController.list);
router.get("/:id", requireAdmin, assetsController.detail);
router.get("/:id/usage", requireAdmin, assetsController.usage);
router.post("/upload", requireAdmin, uploadAssetFile, assetsController.create);
router.post("/:id/upload", requireAdmin, uploadAssetFile, assetsController.replace);
router.patch("/:id/active-version", requireAdmin, assetsController.rollback);
router.patch("/:id/archive", requireAdmin, assetsController.archive);
router.delete("/:id", requireAdmin, assetsController.remove);

module.exports = router;
