const assetService = require("../../services/asset.service");

const sanitizeAsset = (asset) => {
  const doc = asset.toObject ? asset.toObject() : asset;
  return {
    ...doc,
    active: doc.versions.find((v) => v.version === doc.activeVersion) || null,
    versionCount: doc.versions.length,
  };
};

const handleError = (res, error) => {
  const status = error.statusCode || 500;
  return res.status(status).json({ errorMessage: error.message || "Đã xảy ra lỗi." });
};

const AssetsController = {
  list: async (req, res) => {
    try {
      const { category, label, status, page, limit } = req.query;
      const result = await assetService.listAssets({ category, label, status, page, limit });
      return res.status(200).json({
        ...result,
        items: result.items.map(sanitizeAsset),
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  detail: async (req, res) => {
    try {
      const asset = await assetService.getAssetById(req.params.id);
      return res.status(200).json(sanitizeAsset(asset));
    } catch (error) {
      return handleError(res, error);
    }
  },

  usage: async (req, res) => {
    try {
      await assetService.getAssetById(req.params.id);
      const usage = await assetService.findUsage(req.params.id);
      return res.status(200).json(usage);
    } catch (error) {
      return handleError(res, error);
    }
  },

  create: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ errorMessage: "Vui lòng chọn ảnh để tải lên." });
      }
      const { category, label } = req.body;
      const asset = await assetService.createAsset({ category, label, buffer: req.file.buffer });
      return res.status(200).json(sanitizeAsset(asset));
    } catch (error) {
      return handleError(res, error);
    }
  },

  replace: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ errorMessage: "Vui lòng chọn ảnh để tải lên." });
      }
      const asset = await assetService.replaceAsset(req.params.id, { buffer: req.file.buffer });
      return res.status(200).json(sanitizeAsset(asset));
    } catch (error) {
      return handleError(res, error);
    }
  },

  rollback: async (req, res) => {
    try {
      const asset = await assetService.setActiveVersion(req.params.id, req.body.version);
      return res.status(200).json(sanitizeAsset(asset));
    } catch (error) {
      return handleError(res, error);
    }
  },

  archive: async (req, res) => {
    try {
      const asset = await assetService.archiveAsset(req.params.id);
      return res.status(200).json(sanitizeAsset(asset));
    } catch (error) {
      return handleError(res, error);
    }
  },

  remove: async (req, res) => {
    try {
      const asset = await assetService.getAssetById(req.params.id);
      if (asset.status !== "archived") {
        return res.status(400).json({ errorMessage: "Chỉ có thể xóa tài nguyên đã được lưu trữ." });
      }
      await assetService.deleteAsset(req.params.id);
      return res.status(200).json({ message: "Deleted" });
    } catch (error) {
      return handleError(res, error);
    }
  },
};

module.exports = AssetsController;
