const authenticateSession = require("./authenticateSession.middleware");

const ADMIN_ROLE = "ADMIN";

const checkAdminRole = (req, res, next) => {
  const isAdmin = req.user?.roles?.some((role) => role.role === ADMIN_ROLE);
  if (!isAdmin) return res.status(403).json({ errorMessage: "Bạn không có quyền quản trị." });
  return next();
};

module.exports = [authenticateSession, checkAdminRole];
