/**
 * Contact Routes — /contacts/:uid
 */
const express = require("express");
const router  = express.Router();
const { db }  = require('../../config/dependencies');
const { logEvent, getContacts } = require('../../services/coreServices');

module.exports = function(middlewares) {
  const { requireAuth, requireSelfOrAdmin } = middlewares;

  router.post("/contacts/:uid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { name, phone, type } = req.body;
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      if (!name || !phone) return res.status(400).json({ success: false, message: "name and phone are required" });
      const validTypes = ["family", "trusted", "volunteer", "ngo", "police", "emergency"];
      const contactType = validTypes.includes(type) ? type : "trusted";
      await db.collection("users").doc(req.params.uid).collection("contacts").add({ name, phone, type: contactType, createdAt: new Date() });
      logEvent("CONTACT", `Added for ${req.params.uid}`, { name, type: contactType });
      res.status(200).json({ success: true, message: "Contact added" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get("/contacts/:uid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const contacts = await getContacts(req.params.uid);
      res.status(200).json({ success: true, contacts });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.delete("/contacts/:uid/:cid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      await db.collection("users").doc(req.params.uid).collection("contacts").doc(req.params.cid).delete();
      logEvent("CONTACT", `Deleted ${req.params.cid} for ${req.params.uid}`);
      res.status(200).json({ success: true, message: "Contact deleted" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
