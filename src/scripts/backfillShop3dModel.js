/*
 * One-time backfill: assign a unique `shop3dModel` GLB file name to each
 * product that currently appears in the 3D shop. The file name is derived
 * from the product's existing slug so it is stable and unique per product.
 *
 * Products not listed here keep shop3dModel = "" and stay hidden from the
 * 3D shop until a model is assigned (via the admin form or a later backfill).
 *
 * Run manually: node src/scripts/backfillShop3dModel.js
 */
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const productModel = require("../model/product.model");

// Product display name -> unique GLB file name (one node per file).
const MODEL_BY_NAME = {
  "Jagermeister Original 700ml": "jager-original-700.glb",
  "Jagermeister Original 1000ml": "jager-original-1000.glb",
  "Jagermeister Orange 1000ml": "jager-orange-1000.glb",
  "Jagermeister Original 200ml": "jager-original-200.glb",
  "Jagermeister Original nội địa Đức 700ml": "jager-original-de-700.glb",
  "Jagermeister Original 20ml": "jager-original-20.glb",
  "Jagermeister Original nội địa Đức 100ml": "jager-original-de-100.glb",
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected to DB");

  let updated = 0;
  let missing = 0;
  for (const [name, model] of Object.entries(MODEL_BY_NAME)) {
    const result = await productModel.updateOne(
      { name },
      { $set: { shop3dModel: model } }
    );
    if (result.matchedCount === 0) {
      console.warn(`[missing] no product named "${name}"`);
      missing += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`Backfill done: updated ${updated}, missing ${missing}`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
