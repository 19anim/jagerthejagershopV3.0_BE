const multer = require("multer");

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSize },
  fileFilter: (_req, file, callback) => {
    const isAllowed = allowedImageTypes.includes(file.mimetype);
    callback(isAllowed ? null : new Error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP."), isAllowed);
  },
});

const uploadAssetFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    console.error("Asset upload failed:", {
      code: error.code,
      message: error.message,
      httpCode: error.http_code,
    });

    let message = error.message;
    if (error.code === "LIMIT_FILE_SIZE") {
      message = "Ảnh tài nguyên không được vượt quá 5 MB.";
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Chỉ được tải lên một ảnh với field name là file.";
    }

    return res.status(400).json({ errorMessage: message });
  });
};

module.exports = { uploadAssetFile };
