const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
    },
  ],
  slug: {
    type: String,
  },
});

const Category = mongoose.model("Categories", CategorySchema);
module.exports = Category;
