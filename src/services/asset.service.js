const slugify = require("slugify");
const assetModel = require("../model/asset.model");
const { uploadAssetBuffer, destroyUploadedAsset } = require("../utils/cloudinary.utils");

const ASSET_CATEGORIES = ["product", "category"];

const normalizeIdentity = (category, label) => {
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  const normalizedLabel = slugify(String(label ?? "").trim(), { lower: true });

  if (!ASSET_CATEGORIES.includes(normalizedCategory)) {
    const error = new Error("Danh mục tài nguyên không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
  if (!normalizedLabel) {
    const error = new Error("Nhãn tài nguyên không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
  return { category: normalizedCategory, label: normalizedLabel };
};

const activeVersionOf = (asset) => asset.versions.find((v) => v.version === asset.activeVersion);

const resolveAssetImage = async (assetId) => {
  const asset = await getAssetById(assetId);
  const active = activeVersionOf(asset);
  if (!active) {
    const error = new Error("Tài nguyên không có phiên bản hợp lệ.");
    error.statusCode = 400;
    throw error;
  }
  return { image: active.secureUrl, imagePublicId: "", assetId: asset.id };
};

const resolveActiveImagesByAssetIds = async (assetIds) => {
  const uniqueIds = [...new Set(assetIds.filter(Boolean).map(String))];
  if (!uniqueIds.length) return new Map();
  const assets = await assetModel.find({ _id: { $in: uniqueIds } });
  const map = new Map();
  assets.forEach((asset) => {
    const active = activeVersionOf(asset);
    if (active) map.set(String(asset._id), active.secureUrl);
  });
  return map;
};

const findUsage = async (id) => {
  const productModel = require("../model/product.model");
  const categoryModel = require("../model/category.model");
  const [products, categories] = await Promise.all([
    productModel.find({ assetId: id }).select("name slug"),
    categoryModel.find({ assetId: id }).select("name slug"),
  ]);
  return { products, categories };
};

const maxVersion = (versions) => versions.reduce((max, v) => Math.max(max, v.version), 0);

const listAssets = async ({ category, label, status, page = 1, limit = 20 }) => {
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (label) filter.label = new RegExp(label.trim(), "i");

  const numericPage = Math.max(1, Number(page) || 1);
  const numericLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    assetModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit),
    assetModel.countDocuments(filter),
  ]);

  return { items, total, page: numericPage, limit: numericLimit };
};

const getAssetById = async (id) => {
  const asset = await assetModel.findById(id);
  if (!asset) {
    const error = new Error("Không tìm thấy tài nguyên.");
    error.statusCode = 404;
    throw error;
  }
  return asset;
};

const createAsset = async ({ category, label, buffer }) => {
  const identity = normalizeIdentity(category, label);

  const existing = await assetModel.findOne({ category: identity.category, label: identity.label });
  if (existing) {
    const error = new Error("Tài nguyên với danh mục và nhãn này đã tồn tại.");
    error.statusCode = 409;
    throw error;
  }

  const uploadResult = await uploadAssetBuffer(buffer, { ...identity, version: 1 });

  const asset = await assetModel.create({
    category: identity.category,
    label: identity.label,
    activeVersion: 1,
    versions: [
      {
        version: 1,
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      },
    ],
  });

  return asset;
};

const replaceAsset = async (id, { buffer }) => {
  const asset = await getAssetById(id);
  const nextVersion = maxVersion(asset.versions) + 1;

  const uploadResult = await uploadAssetBuffer(buffer, {
    category: asset.category,
    label: asset.label,
    version: nextVersion,
  });

  asset.versions.push({
    version: nextVersion,
    publicId: uploadResult.public_id,
    secureUrl: uploadResult.secure_url,
    width: uploadResult.width,
    height: uploadResult.height,
    format: uploadResult.format,
    bytes: uploadResult.bytes,
  });
  asset.activeVersion = nextVersion;
  asset.status = "active";
  await asset.save();

  return asset;
};

const setActiveVersion = async (id, version) => {
  const asset = await getAssetById(id);
  const numericVersion = Number(version);
  const found = asset.versions.some((v) => v.version === numericVersion);
  if (!found) {
    const error = new Error("Không tìm thấy phiên bản này.");
    error.statusCode = 404;
    throw error;
  }
  asset.activeVersion = numericVersion;
  await asset.save();
  return asset;
};

const archiveAsset = async (id) => {
  const asset = await getAssetById(id);
  asset.status = "archived";
  await asset.save();
  return asset;
};

const deleteAsset = async (id) => {
  const asset = await getAssetById(id);
  await Promise.allSettled(asset.versions.map((v) => destroyUploadedAsset(v.publicId)));
  await assetModel.findByIdAndDelete(id);
};

module.exports = {
  ASSET_CATEGORIES,
  listAssets,
  getAssetById,
  createAsset,
  replaceAsset,
  setActiveVersion,
  archiveAsset,
  deleteAsset,
  activeVersionOf,
  resolveAssetImage,
  resolveActiveImagesByAssetIds,
  findUsage,
};
