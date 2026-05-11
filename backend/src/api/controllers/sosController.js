/**
 * SOS / Emergency Routes — /trigger-sos, /smart-emergency, /sensor/*
 */
const express = require("express");
const router  = express.Router();
const { logEvent, getSession, getRiskLevel, applyRiskDelta, saveSensorEvent, saveAlert, triggerEmergency } = require('../../services/coreServices');

module.exports = function(middlewares, io) {
  const { requireAuth, requireSelfOrAdmin } = middlewares;

  // ── Sensor routes ────────────────────────────────────────────────────────

  router.post("/sensor/shake", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, location = null } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      await saveSensorEvent(uid, "shake", true, 20);
      const { score, riskLevel } = await applyRiskDelta(uid, 20, "Phone Shake Detected", "shake", location, io);
      res.status(200).json({ success: true, message: "Shake event processed", riskScore: score, riskLevel: riskLevel.label });
    } catch (error) {
      logEvent("ERROR", "sensor/shake failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/sensor/sound", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, soundLevel = 0, location = null } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      await saveSensorEvent(uid, "sound", soundLevel, 25);
      const { score, riskLevel } = await applyRiskDelta(uid, 25, "Loud Sound / Scream Detected", "sound", location, io);
      res.status(200).json({ success: true, message: "Sound event processed", riskScore: score, riskLevel: riskLevel.label });
    } catch (error) {
      logEvent("ERROR", "sensor/sound failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/sensor/voice", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, transcript = "", location = null } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      await saveSensorEvent(uid, "voice", transcript, 40);
      const { score, riskLevel } = await applyRiskDelta(uid, 40, "Emergency Voice Trigger", "voice", location, io);
      res.status(200).json({ success: true, message: "Voice event processed", transcript, riskScore: score, riskLevel: riskLevel.label });
    } catch (error) {
      logEvent("ERROR", "sensor/voice failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ── SOS routes ───────────────────────────────────────────────────────────

  router.post("/trigger-sos", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, reason = "Emergency SOS", riskScore = 100, location = null } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });

      logEvent("SOS", `🚨 SOS received from ${uid}`, { reason, riskScore });
      const riskLevel = getRiskLevel(riskScore);
      const session   = getSession(uid);
      session.riskScore = Math.min(riskScore, 100);

      if (riskScore > 30) {
        await triggerEmergency(uid, reason, riskScore, location, io);
      } else {
        await saveAlert(uid, `🚨 SOS received: ${reason}`, riskScore, "emergency");
        logEvent("SOS", `LOW risk SOS — no external alerts dispatched for ${uid}`);
      }

      res.status(200).json({ success: true, message: "SOS Triggered Successfully", alertLevel: riskLevel.label, emoji: riskLevel.emoji, startRecording: riskScore >= 61, vibration: true });
    } catch (error) {
      logEvent("ERROR", "trigger-sos failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/smart-emergency", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, voice = "", soundLevel = -100, shake = false, location = null } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });

      let delta = 0;
      if (voice.toLowerCase().includes("help me") || voice.toLowerCase().includes("save me") || voice.toLowerCase().includes("emergency")) delta += 40;
      if (soundLevel > -5) delta += 25;
      if (shake === true) delta += 20;

      if (delta === 0) {
        return res.status(200).json({ success: true, message: "No risk detected", riskScore: getSession(uid).riskScore });
      }

      const reason = [shake ? "Shake" : null, soundLevel > -5 ? "Loud Sound" : null, delta >= 40 ? "Voice Trigger" : null].filter(Boolean).join(" + ");
      const { score, riskLevel } = await applyRiskDelta(uid, delta, reason, "smart", location, io);

      res.status(200).json({ success: true, message: "Smart emergency evaluated", riskScore: score, riskLevel: riskLevel.label });
    } catch (error) {
      logEvent("ERROR", "smart-emergency failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
