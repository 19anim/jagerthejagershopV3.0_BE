const mongoose = require("mongoose");

// Shop-wide settings, one document (key "main"). Today only the 3D shop's seasonal theme.
const SHOP3D_THEMES = ["auto", "none", "tet", "christmas", "midautumn", "halloween"];

const shopSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    shop3dTheme: { type: String, enum: SHOP3D_THEMES, default: "auto" },
  },
  { timestamps: true }
);

const ShopSetting = mongoose.model("ShopSettings", shopSettingSchema);
module.exports = { ShopSetting, SHOP3D_THEMES };
