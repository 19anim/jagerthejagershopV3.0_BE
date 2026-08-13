/*
 * One-time migration: wrap existing Product/Category images (uploaded before
 * the Asset Library existed) into Asset documents as version 1, and back-link
 * assetId, without touching Cloudinary or the existing image URLs.
 *
 * Run manually: node src/scripts/migrateLegacyAssetImages.js
 */
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const slugify = require("slugify");

dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const productModel = require("../model/product.model");
const categoryModel = require("../model/category.model");
const assetModel = require("../model/asset.model");

const uniqueLabel = async (category, baseLabel) => {
  let label = baseLabel;
  let suffix = 2;
  while (await assetModel.exists({ category, label })) {
    label = `${baseLabel}-${suffix}`;
    suffix += 1;
  }
  return label;
};

const migrateCollection = async (model, category) => {
  const docs = await model.find({ image: { $exists: true, $ne: "" }, assetId: null });
  let created = 0;
  let skipped = 0;

  for (const doc of docs) {
    const baseLabel = slugify(String(doc.slug || doc.name || doc._id), { lower: true });
    if (!baseLabel) {
      console.warn(`[skip] ${category} ${doc._id}: no usable label`);
      skipped += 1;
      continue;
    }

    const label = await uniqueLabel(category, baseLabel);
    if (label !== baseLabel) {
      console.warn(`[collision] ${category} ${doc._id}: label "${baseLabel}" taken, using "${label}"`);
    }

    const asset = await assetModel.create({
      category,
      label,
      activeVersion: 1,
      versions: [
        {
          version: 1,
          publicId: doc.imagePublicId || `legacy-${doc._id}`,
          secureUrl: doc.image,
        },
      ],
    });

    await model.updateOne({ _id: doc._id }, { $set: { assetId: asset._id } });
    created += 1;
  }

  return { created, skipped, total: docs.length };
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected to DB");

  const productResult = await migrateCollection(productModel, "product");
  console.log(`Products: created ${productResult.created} assets, skipped ${productResult.skipped} of ${productResult.total}`);

  const categoryResult = await migrateCollection(categoryModel, "category");
  console.log(`Categories: created ${categoryResult.created} assets, skipped ${categoryResult.skipped} of ${categoryResult.total}`);

  await mongoose.disconnect();
  console.log("Done.");
};

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
