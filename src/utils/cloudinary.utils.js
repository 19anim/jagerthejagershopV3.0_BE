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

module.exports = { cloudinary, productImageStorage, categoryImageStorage, destroyUploadedAsset };
