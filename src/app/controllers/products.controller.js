const productModel = require("../../model/product.model");
const categoryModel = require("../../model/category.model");
const productDescriptionModel = require("../../model/productDescription.model");
const { destroyUploadedAsset } = require("../../utils/cloudinary.utils");
const slugify = require("slugify");

const normalizeProductFields = (body) => {
  const product = { ...body };
  const numericFields = ["priceInInteger", "soldAmount", "stock"];

  numericFields.forEach((field) => {
    if (product[field] !== undefined) product[field] = Number(product[field]);
  });

  if (product.isBestSeller !== undefined) {
    product.isBestSeller = product.isBestSeller === true || product.isBestSeller === "true";
  }

  if (!product.description) delete product.description;
  if (!product.category) delete product.category;
  if (product.name) product.slug = slugify(product.name, { lower: true });

  return product;
};

const ProductController = {
  getAllProducts: async (_req, res) => {
    try {
      const products = await productModel.find().populate(["category", "description"]);
      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  getBestSellers: async (req, res) => {
    try {
      const requestedLimit = Number.parseInt(req.query.limit, 10) || 5;
      const limit = Math.min(Math.max(requestedLimit, 1), 10);
      const products = await productModel
        .find()
        .sort({ soldAmount: -1, createdAt: -1 })
        .limit(limit)
        .populate(["category", "description"]);
      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  getAProductById: async (req, res) => {
    try {
      const product = await productModel.findById(req.params.id).populate(["category", "description"]);
      if (!product) return res.status(404).json({ errorMessage: "Không tìm thấy sản phẩm." });
      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  getAProductBySlug: async (req, res) => {
    try {
      const product = await productModel.findOne({ slug: req.params.slug }).populate(["category", "description"]);
      if (!product) return res.status(404).json({ errorMessage: "Không tìm thấy sản phẩm." });
      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  getAProductByCategoryId: async (req, res) => {
    try {
      const products = await productModel
        .find({ category: req.params.categoryId })
        .populate(["category", "description"]);
      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  addAProduct: async (req, res) => {
    const uploadedPublicId = req.file?.filename;
    try {
      const productInformation = normalizeProductFields(req.body);
      if (!req.file && !productInformation.image) {
        return res.status(400).json({ errorMessage: "Vui lòng chọn ảnh sản phẩm." });
      }

      if (req.file) {
        productInformation.image = req.file.path;
        productInformation.imagePublicId = uploadedPublicId;
      }

      const savedProduct = await new productModel(productInformation).save();
      try {
        if (savedProduct.category) {
          await categoryModel.findByIdAndUpdate(savedProduct.category, {
            $addToSet: { products: savedProduct.id },
          });
        }
      } catch (referenceError) {
        console.error("Product reference update failed:", referenceError.message);
      }
      return res.status(200).json(savedProduct);
    } catch (error) {
      await destroyUploadedAsset(uploadedPublicId);
      return res.status(500).json({ errorMessage: error.message });
    }
  },

  editAProduct: async (req, res) => {
    const uploadedPublicId = req.file?.filename;
    try {
      const existingProduct = await productModel.findById(req.params.id);
      if (!existingProduct) {
        await destroyUploadedAsset(uploadedPublicId);
        return res.status(404).json({ errorMessage: "Không tìm thấy sản phẩm." });
      }

      const productInformation = normalizeProductFields(req.body);
      if (req.file) {
        productInformation.image = req.file.path;
        productInformation.imagePublicId = uploadedPublicId;
      }

      const previousCategory = existingProduct.category?.toString();
      const updatedProduct = await productModel.findByIdAndUpdate(
        req.params.id,
        { $set: productInformation },
        { new: true, runValidators: true }
      ).populate(["category", "description"]);

      const nextCategory = updatedProduct.category?._id?.toString() || updatedProduct.category?.toString();
      try {
        if (previousCategory !== nextCategory) {
          if (previousCategory) {
            await categoryModel.findByIdAndUpdate(previousCategory, { $pull: { products: updatedProduct.id } });
          }
          if (nextCategory) {
            await categoryModel.findByIdAndUpdate(nextCategory, { $addToSet: { products: updatedProduct.id } });
          }
        }
      } catch (referenceError) {
        console.error("Product category reference update failed:", referenceError.message);
      }

      if (req.file && existingProduct.imagePublicId) {
        await destroyUploadedAsset(existingProduct.imagePublicId);
      }

      return res.status(200).json(updatedProduct);
    } catch (error) {
      await destroyUploadedAsset(uploadedPublicId);
      return res.status(500).json({ errorMessage: error.message });
    }
  },

  deleteAProduct: async (req, res) => {
    try {
      const product = await productModel.findByIdAndDelete(req.params.id);
      if (!product) return res.status(404).json({ errorMessage: "Không tìm thấy sản phẩm." });

      await destroyUploadedAsset(product.imagePublicId);
      await categoryModel.updateMany({}, { $pull: { products: product.id } });
      await productDescriptionModel.updateMany({}, { $pull: { products: product.id } });
      return res.status(200).json("Deleted");
    } catch (error) {
      return res.status(500).json(error);
    }
  },
};

module.exports = ProductController;
