const mongoose = require("mongoose");

const assetVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    secureUrl: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    format: {
      type: String,
    },
    bytes: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const assetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["product", "category"],
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      required: true,
    },
    activeVersion: {
      type: Number,
      required: true,
      min: 1,
    },
    versions: {
      type: [assetVersionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

assetSchema.index({ category: 1, label: 1 }, { unique: true });
assetSchema.index({ status: 1, category: 1, updatedAt: -1 });

const Asset = mongoose.model("Assets", assetSchema);
module.exports = Asset;
