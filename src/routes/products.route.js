const express = require("express");
const router = express.Router();
const productController = require("../app/controllers/products.controller");
const requireAdmin = require("../middlewares/requireAdmin.middleware");
const { productImageStorage } = require("../utils/cloudinary.utils");
const { createImageUploadMiddleware } = require("../middlewares/imageUpload.middleware");

const uploadProductImage = createImageUploadMiddleware(productImageStorage, "sản phẩm");

router.get("/getAllProducts", productController.getAllProducts);
router.get("/getBestSellers", productController.getBestSellers);
router.get("/getProductById/:id", productController.getAProductById);
router.get("/getProductBySlug/:slug", productController.getAProductBySlug);
router.get("/getProductByCategoryId/:categoryId", productController.getAProductByCategoryId);
router.post("/create", requireAdmin, uploadProductImage, productController.addAProduct);
router.put("/EditProductById/:id", requireAdmin, uploadProductImage, productController.editAProduct);
router.delete("/DeleteProductById/:id", requireAdmin, productController.deleteAProduct);

module.exports = router;
