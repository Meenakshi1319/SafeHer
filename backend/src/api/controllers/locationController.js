/**
 * Location Routes — /save-location, /location/:uid
 */
const express = require("express");
const router  = express.Router();
const { db }  = require('../../config/dependencies');
const { logEvent, generateLocationLink } = require('../../services/coreServices');

module.exports = function(middlewares) {
  const { requireAuth, requireSelfOrAdmin } = middlewares;

  router.post("/save-location", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, latitude, longitude } = req.body;
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      if (!uid || latitude == null || longitude == null) {
        return res.status(400).json({ success: false, message: "uid, latitude, and longitude are required" });
      }
      await db.collection("locations").add({ uid, latitude, longitude, timestamp: new Date() });
      logEvent("LOCATION", `Saved for ${uid}`, { latitude, longitude });
      res.status(200).json({ success: true, message: "Location Saved Successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get("/location/:uid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      const snap = await db.collection("locations").where("uid", "==", req.params.uid).orderBy("timestamp", "desc").limit(1).get();
      if (snap.empty) return res.status(404).json({ success: false, message: "No location found" });
      const loc = snap.docs[0].data();
      res.status(200).json({ success: true, latitude: loc.latitude, longitude: loc.longitude, timestamp: loc.timestamp, mapsLink: generateLocationLink(loc.latitude, loc.longitude) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Heatmap Data API
  router.get("/location/heatmap", requireAuth, (req, res) => {
    try {
      // Mocked high-risk hotspots for demonstration (e.g., around central coordinates)
      const hotspots = [
        { latitude: 12.9716, longitude: 77.5946, intensity: 0.8 },
        { latitude: 12.9352, longitude: 77.6245, intensity: 0.9 },
        { latitude: 12.9141, longitude: 77.6361, intensity: 0.6 }
      ];
      res.status(200).json({ success: true, data: hotspots });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Safe Route Calculation API
  router.post("/location/safe-route", requireAuth, (req, res) => {
    try {
      const { start, end } = req.body;
      if (!start || !end) return res.status(400).json({ success: false, message: "start and end coordinates required" });
      
      // Mocked routing logic: Return dummy waypoints avoiding the hotspots
      const route = {
        distance: "5.2 km",
        duration: "15 mins",
        waypoints: [
          start,
          { latitude: start.latitude + 0.01, longitude: start.longitude + 0.01 },
          { latitude: end.latitude - 0.01, longitude: end.longitude - 0.01 },
          end
        ]
      };
      
      logEvent("ROUTING", `Safe route generated`, { start, end });
      res.status(200).json({ success: true, route });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
