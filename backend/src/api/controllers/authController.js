/**
 * Auth Routes — /signup, /login, /logout, /verify-phone-login, /user/:uid
 */
const express = require("express");
const router  = express.Router();
const { admin, db } = require('../../config/dependencies');
const { logEvent }  = require('../../services/coreServices');

module.exports = function(middlewares) {
  const { requireAuth, requireSelfOrAdmin } = middlewares;

  router.post("/signup", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, name, email, phone = "", emergencyContacts = [] } = req.body;
      if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });
      if (!db) return res.status(500).json({ success: false, message: "Firestore not initialized" });
      if (!uid || !name || !email) return res.status(400).json({ success: false, message: "uid, name, and email are required" });

      await db.collection("users").doc(uid).set({ uid, name, email, phone, createdAt: new Date(), lastLoginAt: new Date() }, { merge: true });

      for (const contact of emergencyContacts) {
        await db.collection("users").doc(uid).collection("contacts").add({ name: contact.name, phone: contact.phone, type: contact.type || "trusted", createdAt: new Date() });
      }

      logEvent("AUTH", `Profile created: ${email}`, { uid });
      res.status(200).json({ success: true, message: "Profile Created Successfully", uid });
    } catch (error) {
      logEvent("ERROR", "Signup profile creation failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });
      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;
      await db.collection("users").doc(uid).set({ lastLoginAt: new Date() }, { merge: true });
      logEvent("AUTH", `Login: ${decoded.email}`, { uid });
      res.status(200).json({ success: true, message: "Login Successful", uid, email: decoded.email });
    } catch (error) {
      logEvent("ERROR", "Login failed", { error: error.message });
      res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
  });

  router.post("/logout", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });
      await admin.auth().revokeRefreshTokens(uid);
      logEvent("AUTH", `Logout: ${uid}`);
      res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      logEvent("ERROR", "Logout failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/verify-phone-login", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });
      const decoded = await admin.auth().verifyIdToken(idToken);
      logEvent("AUTH", `Phone login verified: ${decoded.phone_number}`);
      res.status(200).json({ success: true, message: "Phone Verified Successfully", uid: decoded.uid, phone: decoded.phone_number });
    } catch (error) {
      logEvent("ERROR", "Phone verify failed", { error: error.message });
      res.status(500).json({ success: false, message: "Phone Verification Failed" });
    }
  });

  router.get("/user/:uid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      const docSnap = await db.collection("users").doc(req.params.uid).get();
      if (!docSnap.exists) return res.status(404).json({ success: false, message: "User not found" });
      res.status(200).json({ success: true, user: { uid: docSnap.id, ...docSnap.data() } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
