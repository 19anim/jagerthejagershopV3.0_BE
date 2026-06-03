const categoryModel = require("../../model/category.model");
const productModel = require("../../model/product.model");
const { destroyUploadedAsset } = require("../../utils/cloudinary.utils");
const slugify = require("slugify");

const normalizeCategoryFields = (body) => {
  const category = { ...body };
  if (category.name) category.slug = slugify(category.name, { lower: true });
  delete category._id;
  delete category.__v;
  delete category.createdAt;
  delete category.updatedAt;
  delete category.imagePublicId;
  delete category.products;
  return category;
};

const CategoriesController = {
  getAllCategories: async (_req, res) => {
    try {
      const categories = await categoryModel.find();
      return res.status(200).json(categories);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  getACategory: async (req, res) => {
    try {
      const category = await categoryModel.findById(req.params.id);
      if (!category) return res.status(404).json({ errorMessage: "Không tìm thấy danh mục." });
      return res.status(200).json(category);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  getACategoryBySlug: async (req, res) => {
    try {
      const category = await categoryModel.findOne({ slug: req.params.slug });
      if (!category) return res.status(404).json({ errorMessage: "Không tìm thấy danh mục." });
      return res.status(200).json(category);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  addACategory: async (req, res) => {
    const uploadedPublicId = req.file?.filename;
    try {
      const categoryInformation = normalizeCategoryFields(req.body);
      if (!req.file && !categoryInformation.image) {
        return res.status(400).json({ errorMessage: "Vui lòng chọn ảnh danh mục." });
      }

      if (req.file) {
        categoryInformation.image = req.file.path;
        categoryInformation.imagePublicId = uploadedPublicId;
      }

      const savedNewCategory = await new categoryModel(categoryInformation).save();
      return res.status(200).json(savedNewCategory);
    } catch (error) {
      await destroyUploadedAsset(uploadedPublicId);
      return res.status(500).json({ errorMessage: error.message });
    }
  },

  editACategory: async (req, res) => {
    const uploadedPublicId = req.file?.filename;
    try {
      const existingCategory = await categoryModel.findById(req.params.id);
      if (!existingCategory) {
        await destroyUploadedAsset(uploadedPublicId);
        return res.status(404).json({ errorMessage: "Không tìm thấy danh mục." });
      }

      const categoryInformation = normalizeCategoryFields(req.body);
      if (req.file) {
        categoryInformation.image = req.file.path;
        categoryInformation.imagePublicId = uploadedPublicId;
      }

      const updatedCategory = await categoryModel.findByIdAndUpdate(
        req.params.id,
        { $set: categoryInformation },
        { new: true, runValidators: true }
      );

      if (req.file && existingCategory.imagePublicId) {
        await destroyUploadedAsset(existingCategory.imagePublicId);
      }

      return res.status(200).json(updatedCategory);
    } catch (error) {
      await destroyUploadedAsset(uploadedPublicId);
      return res.status(500).json({ errorMessage: error.message });
    }
  },

  deleteACategory: async (req, res) => {
    try {
      const productCount = await productModel.countDocuments({ category: req.params.id });
      if (productCount > 0) {
        return res.status(400).json({ errorMessage: "Không thể xóa danh mục đang có sản phẩm." });
      }

      const category = await categoryModel.findByIdAndDelete(req.params.id);
      if (!category) return res.status(404).json({ errorMessage: "Không tìm thấy danh mục." });
      await destroyUploadedAsset(category.imagePublicId);
      return res.status(200).json("Deleted");
    } catch (error) {
      return res.status(500).json(error);
    }
  },
};

module.exports = CategoriesController;
