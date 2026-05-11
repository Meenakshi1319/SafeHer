/**
 * Risk Score Routes — /update-risk, /reset-risk, /risk/:uid, /risk/:uid/history
 */
const express = require("express");
const router  = express.Router();
const { db }  = require('../../config/dependencies');
const { logEvent, getSession, getRiskLevel, applyRiskDelta, saveRiskHistory, saveAlert } = require('../../services/coreServices');

module.exports = function(middlewares, io) {
  const { requireAuth, requireSelfOrAdmin } = middlewares;

  router.post("/update-risk", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, value = 0, reason = "", source = "manual", location = null } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      const { score, riskLevel } = await applyRiskDelta(uid, value, reason, source, location, io);
      res.status(200).json({ success: true, riskScore: score, riskLevel: riskLevel.label, emoji: riskLevel.emoji });
    } catch (error) {
      logEvent("ERROR", "update-risk failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/reset-risk", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      const session = getSession(uid);
      session.riskScore = 0;
      await saveRiskHistory(uid, 0, 0, "User confirmed safe — risk reset", "reset");
      await saveAlert(uid, "✅ Risk score reset — user confirmed safe", 0, "reset");
      logEvent("RISK", `Reset for ${uid}`);
      io.to(`user:${uid}`).emit("risk_reset", { uid, timestamp: new Date() });
      io.to("admin").emit("risk_reset", { uid, timestamp: new Date() });
      res.status(200).json({ success: true, message: "Risk Score Reset to 0" });
    } catch (error) {
      logEvent("ERROR", "reset-risk failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get("/risk/:uid", requireAuth, requireSelfOrAdmin, (req, res) => {
    try {
      const session   = getSession(req.params.uid);
      const riskLevel = getRiskLevel(session.riskScore);
      res.status(200).json({ success: true, uid: req.params.uid, riskScore: session.riskScore, riskLevel: riskLevel.label, emoji: riskLevel.emoji });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get("/risk/:uid/history", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      const snap = await db.collection("users").doc(req.params.uid).collection("riskHistory").orderBy("createdAt", "desc").get();
      const history = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.status(200).json({ success: true, history });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
