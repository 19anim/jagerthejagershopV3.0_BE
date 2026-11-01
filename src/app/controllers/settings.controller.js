const { ShopSetting, SHOP3D_THEMES } = require("../../model/shopSetting.model");

const getShop3dTheme = async (req, res) => {
  try {
    const doc = await ShopSetting.findOne({ key: "main" }).lean();
    return res.status(200).json({ shop3dTheme: doc?.shop3dTheme || "auto" });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Không tải được cài đặt." });
  }
};

const setShop3dTheme = async (req, res) => {
  const { shop3dTheme } = req.body || {};
  if (!SHOP3D_THEMES.includes(shop3dTheme)) {
    return res.status(400).json({ errorMessage: "Chủ đề không hợp lệ." });
  }
  try {
    const doc = await ShopSetting.findOneAndUpdate(
      { key: "main" },
      { $set: { shop3dTheme } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return res.status(200).json({ shop3dTheme: doc.shop3dTheme });
  } catch (error) {
    return res.status(500).json({ errorMessage: "Không lưu được cài đặt." });
  }
};

module.exports = { getShop3dTheme, setShop3dTheme };
