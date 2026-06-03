const authenticateSession = require("./authenticateSession.middleware");

const optionalSession = (req, res, next) => {
  const hasSessionCookie = req.cookies?.access_token || req.cookies?.refresh_token;
  if (!hasSessionCookie) return next();
  return authenticateSession(req, res, next);
};

module.exports = optionalSession;
