const jwt = require("jsonwebtoken");
const userModel = require("../model/user.model");
const accessTokenUtil = require("../utils/accessToken.utils");
const { setAccessTokenCookie } = require("../utils/authCookie.utils");

const findUserByName = (userName) => userModel.findOne({ userName }).populate("roles");

const authenticateSession = async (req, res, next) => {
  const accessToken = req.cookies?.access_token;
  const refreshToken = req.cookies?.refresh_token;

  try {
    if (accessToken) {
      try {
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const user = await findUserByName(decodedToken.username);
        if (!user) return res.status(401).json({ errorMessage: "Tài khoản không còn tồn tại." });
        req.user = user;
        return next();
      } catch (error) {
        if (error.name !== "TokenExpiredError") {
          return res.status(401).json({ errorMessage: "Access token không hợp lệ." });
        }
      }
    }

    if (!refreshToken) {
      return res.status(401).json({ errorMessage: "Phiên đăng nhập đã hết hạn." });
    }

    const user = await userModel.findOne({ refreshToken }).populate("roles");
    if (!user) {
      return res.status(401).json({ errorMessage: "Refresh token không hợp lệ." });
    }

    const refreshedAccessToken = accessTokenUtil.createAccessToken(
      user.userName,
      process.env.ACCESS_TOKEN_SECRET,
      process.env.ACCESS_TOKEN_LIFE
    );
    setAccessTokenCookie(res, refreshedAccessToken);
    req.user = user;
    return next();
  } catch (error) {
    console.error("Session authentication failed:", error.message);
    return res.status(500).json({ errorMessage: "Không thể xác thực phiên đăng nhập." });
  }
};

module.exports = authenticateSession;
