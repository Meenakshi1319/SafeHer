/**
 * Auth Middleware — requireAuth, requireSelfOrAdmin, requireAdmin
 */
const { admin } = require("../config/dependencies");
const { getSession } = require("../services/coreServices");

async function requireAuth(req, res, next) {
  try {
    if (process.env.NODE_ENV === "test") {
      req.user = {
        uid: req.headers["x-test-uid"] || req.params.uid || req.body.uid || "test-user",
        admin: true,
      };
      return next();
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return res.status(401).json({ success: false, message: "Missing Authorization token" });
    if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });
    req.user = await admin.auth().verifyIdToken(token, true);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

function requireSelfOrAdmin(req, res, next) {
  const targetUid = req.params.uid || req.body.uid;
  if (!targetUid) return res.status(400).json({ success: false, message: "uid is required" });
  if (req.user?.uid === targetUid || req.user?.admin === true) return next();
  return res.status(403).json({ success: false, message: "Forbidden" });
}

function requireAdmin(req, res, next) {
  if (req.user?.admin === true) return next();
  return res.status(403).json({ success: false, message: "Admin access required" });
}

module.exports = { requireAuth, requireSelfOrAdmin, requireAdmin };
