const express = require("express");
const router = express.Router();
const categoriesController = require("../app/controllers/categories.controller");
const requireAdmin = require("../middlewares/requireAdmin.middleware");
const { categoryImageStorage } = require("../utils/cloudinary.utils");
const { createImageUploadMiddleware } = require("../middlewares/imageUpload.middleware");

const uploadCategoryImage = createImageUploadMiddleware(categoryImageStorage, "danh mục");

router.get("/getAllCategories", categoriesController.getAllCategories);
router.get("/getCategoryBySlug/:slug", categoriesController.getACategoryBySlug);
router.get("/getCategoryById/:id", categoriesController.getACategory);
router.post("/", requireAdmin, uploadCategoryImage, categoriesController.addACategory);
router.put("/EditCategoryById/:id", requireAdmin, uploadCategoryImage, categoriesController.editACategory);
router.delete("/DeleteCategoryById/:id", requireAdmin, categoriesController.deleteACategory);

module.exports = router;
