const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product Descriptions",
    },
    image: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
      default: "",
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assets",
      default: null,
    },
    vol: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    priceInInteger: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
    },
    isBestSeller: {
      type: Boolean,
      required: true,
    },
    soldAmount: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
    slug: {
      type: String,
    },
    isNewProduct: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Products", productSchema);
module.exports = Product;
