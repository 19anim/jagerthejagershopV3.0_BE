const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createImageStorage = (folder) => new CloudinaryStorage({
  cloudinary,
  params: {
    folder,
    allowed_formats: ["jpeg", "jpg", "png", "webp"],
  },
});

const productImageStorage = createImageStorage("Jagerthejagershop/Products");
const categoryImageStorage = createImageStorage("Jagerthejagershop/Categories");

const destroyUploadedAsset = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, error.message);
  }
};

const ASSET_FOLDERS = {
  product: "Jagerthejagershop/Assets/Products",
  category: "Jagerthejagershop/Assets/Categories",
};

const uploadAssetBuffer = (buffer, { category, label, version }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `${label}-v${version}`,
        folder: ASSET_FOLDERS[category],
        overwrite: false,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(buffer);
  });

module.exports = {
  cloudinary,
  productImageStorage,
  categoryImageStorage,
  destroyUploadedAsset,
  ASSET_FOLDERS,
  uploadAssetBuffer,
};
