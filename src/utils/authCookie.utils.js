const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

const setAccessTokenCookie = (res, accessToken) => {
  res.cookie("access_token", accessToken, {
    ...sessionCookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refresh_token", refreshToken, {
    ...sessionCookieOptions,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie("access_token", sessionCookieOptions);
  res.clearCookie("refresh_token", sessionCookieOptions);
};

module.exports = {
  clearAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
};
