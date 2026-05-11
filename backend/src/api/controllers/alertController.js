/**
 * Alert History Routes — /alerts/:uid, /alerts/:uid/seen/:aid, /alerts/admin/all
 */
const express = require("express");
const router  = express.Router();
const { db }  = require('../../config/dependencies');

module.exports = function(middlewares) {
  const { requireAuth, requireSelfOrAdmin, requireAdmin } = middlewares;

  router.get("/alerts/:uid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      const snap = await db.collection("users").doc(req.params.uid).collection("alerts").orderBy("createdAt", "desc").get();
      res.status(200).json({ success: true, alerts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/alerts/:uid/seen/:aid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      await db.collection("users").doc(req.params.uid).collection("alerts").doc(req.params.aid).update({ seen: true, seenAt: new Date() });
      res.status(200).json({ success: true, message: "Alert marked as seen" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get("/alerts/admin/all", requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      const snap = await db.collection("globalAlerts").orderBy("timestamp", "desc").get();
      res.status(200).json({ success: true, alerts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
