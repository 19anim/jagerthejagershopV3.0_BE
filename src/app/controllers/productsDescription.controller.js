const productDescriptionModel = require("../../model/productDescription.model");
const productModel = require("../../model/product.model");

const productDescriptionPopulate = {
  path: "products",
  populate: { path: "category" },
};

const normalizeProductIds = (productIds = []) =>
  Array.from(new Set((Array.isArray(productIds) ? productIds : [productIds]).filter(Boolean)));

const syncDescriptionProducts = async (descriptionId, previousProductIds, nextProductIds) => {
  const previousSet = new Set(previousProductIds.map((id) => id.toString()));
  const nextSet = new Set(nextProductIds.map((id) => id.toString()));
  const removedProductIds = [...previousSet].filter((id) => !nextSet.has(id));
  const addedProductIds = [...nextSet].filter((id) => !previousSet.has(id));

  if (removedProductIds.length > 0) {
    await productModel.updateMany(
      { _id: { $in: removedProductIds }, description: descriptionId },
      { $unset: { description: "" } }
    );
  }

  if (addedProductIds.length > 0) {
    await productModel.updateMany(
      { _id: { $in: addedProductIds } },
      { $set: { description: descriptionId } }
    );
    await productDescriptionModel.updateMany(
      { _id: { $ne: descriptionId } },
      { $pull: { products: { $in: addedProductIds } } }
    );
  }
};

const productsDescriptionController = {
  addDescription: async (req, res) => {
    try {
      const { productIds, descriptionTitle, description } = req.body;
      const normalizedProductIds = normalizeProductIds(productIds);
      const savedNewDescription = await new productDescriptionModel({
        products: normalizedProductIds,
        descriptionTitle,
        description,
      }).save();

      await syncDescriptionProducts(savedNewDescription._id, [], normalizedProductIds);
      const populatedDescription = await savedNewDescription.populate(productDescriptionPopulate);
      res.status(200).json(populatedDescription);
    } catch (error) {
      res.status(500).json({ errorMessage: error.message });
    }
  },

  getAllDescription: async (_req, res) => {
    try {
      const descriptions = await productDescriptionModel.find().populate(productDescriptionPopulate);
      res.status(200).json(descriptions);
    } catch (error) {
      res.status(500).json(error);
    }
  },

  editDescription: async (req, res) => {
    try {
      const { productIds, descriptionTitle, description } = req.body;
      const existingDescription = await productDescriptionModel.findById(req.params.descriptionId);
      if (!existingDescription) return res.status(404).json({ errorMessage: "Không tìm thấy mô tả chi tiết." });

      const normalizedProductIds = normalizeProductIds(productIds);
      const previousProductIds = existingDescription.products || [];
      existingDescription.descriptionTitle = descriptionTitle;
      existingDescription.description = description;
      existingDescription.products = normalizedProductIds;
      await existingDescription.save();
      await syncDescriptionProducts(existingDescription._id, previousProductIds, normalizedProductIds);

      const updatedDescription = await existingDescription.populate(productDescriptionPopulate);
      res.status(200).json(updatedDescription);
    } catch (error) {
      res.status(500).json({ errorMessage: error.message });
    }
  },

  deleteDescription: async (req, res) => {
    try {
      const deletedDescription = await productDescriptionModel.findByIdAndDelete(req.params.descriptionId);
      if (!deletedDescription) return res.status(404).json({ errorMessage: "Không tìm thấy mô tả chi tiết." });
      await productModel.updateMany(
        { _id: { $in: deletedDescription.products }, description: deletedDescription._id },
        { $unset: { description: "" } }
      );
      res.status(200).json("Deleted");
    } catch (error) {
      res.status(500).json({ errorMessage: error.message });
    }
  },
};

module.exports = productsDescriptionController;
