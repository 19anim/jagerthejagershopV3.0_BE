const multer = require("multer");

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

const createImageUploadMiddleware = (storage, label) => {
  const upload = multer({
    storage,
    limits: { fileSize: maxImageSize },
    fileFilter: (_req, file, callback) => {
      const isAllowed = allowedImageTypes.includes(file.mimetype);
      callback(isAllowed ? null : new Error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP."), isAllowed);
    },
  });

  return (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      if (!error) return next();

      console.error(`${label} image upload failed:`, {
        code: error.code,
        message: error.message,
        httpCode: error.http_code,
      });

      let message = error.message;
      if (error.code === "LIMIT_FILE_SIZE") {
        message = `Ảnh ${label} không được vượt quá 5 MB.`;
      } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
        message = `Chỉ được tải lên một ảnh ${label} với field name là image.`;
      } else if (error.http_code === 400) {
        message = `Cloudinary không thể đọc ảnh này. ${error.message}`;
      }

      return res.status(400).json({ errorMessage: message });
    });
  };
};

module.exports = { createImageUploadMiddleware };
