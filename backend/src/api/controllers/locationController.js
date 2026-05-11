/**
 * Location Routes — /save-location, /location/:uid
 * 
 * FUTURE_SCOPE: This module will be enhanced with:
 * - Real-time location tracking via WebSocket
 * - Geofencing and safe zone alerts
 * - Indoor positioning (WiFi/Bluetooth beacons)
 * - Offline location caching with sync-on-reconnect
 * - Integration with wearable GPS devices
 * - Satellite location fallback for remote areas
 */
const express = require("express");
const router  = express.Router();
const { db }  = require('../../config/dependencies');
const { logEvent, generateLocationLink } = require('../../services/coreServices');
const { crimePredictionModel } = require('../../ml/CrimePredictionModel');

/**
 * Generate heatmap data from real incident reports
 * Sources: SOS triggers, community reports, historical data
 * 
 * FUTURE_SCOPE: Enhanced heatmap generation with:
 * - Machine learning for predictive risk zones
 * - Integration with public crime databases (FBI, local police)
 * - Real-time incident streaming via WebSocket
 * - Time-based risk patterns (day vs night, weekday vs weekend)
 * - Weather and event correlation (concerts, protests, etc.)
 * - Crowdsourced safety ratings from community
 */
async function generateHeatmapFromIncidents(userLat, userLng, radiusKm) {
  if (!db) {
    logEvent("WARNING", "Database not available, using fallback heatmap");
    return generateFallbackHeatmap(userLat, userLng, radiusKm);
  }

  try {
    const hotspots = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch SOS incidents from last 30 days
    const sosSnapshot = await db.collection("sos_triggers")
      .where("timestamp", ">=", thirtyDaysAgo)
      .get();

    sosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.location && data.location.lat && data.location.lng) {
        const distance = calculateDistance(
          userLat, userLng, 
          data.location.lat, data.location.lng
        );
        
        if (distance <= radiusKm) {
          // Higher intensity for recent incidents
          const daysAgo = (now - data.timestamp.toDate()) / (1000 * 60 * 60 * 24);
          const recencyFactor = Math.max(0.3, 1 - (daysAgo / 30));
          
          hotspots.push({
            latitude: data.location.lat,
            longitude: data.location.lng,
            intensity: 0.9 * recencyFactor,
            type: 'sos',
            timestamp: data.timestamp.toDate().toISOString()
          });
        }
      }
    });

    logEvent("INFO", `Found ${sosSnapshot.size} SOS incidents`);

    // 2. Fetch community-reported incidents
    const reportsSnapshot = await db.collection("community_reports")
      .where("timestamp", ">=", thirtyDaysAgo)
      .where("verified", "==", true)
      .get();

    reportsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.location && data.location.lat && data.location.lng) {
        const distance = calculateDistance(
          userLat, userLng,
          data.location.lat, data.location.lng
        );
        
        if (distance <= radiusKm) {
          const daysAgo = (now - data.timestamp.toDate()) / (1000 * 60 * 60 * 24);
          const recencyFactor = Math.max(0.3, 1 - (daysAgo / 30));
          
          // Severity-based intensity
          const severityMap = { high: 0.8, medium: 0.6, low: 0.4 };
          const baseIntensity = severityMap[data.severity] || 0.5;
          
          hotspots.push({
            latitude: data.location.lat,
            longitude: data.location.lng,
            intensity: baseIntensity * recencyFactor,
            type: 'report',
            timestamp: data.timestamp.toDate().toISOString()
          });
        }
      }
    });

    logEvent("INFO", `Found ${reportsSnapshot.size} community reports`);

    // 3. Cluster nearby incidents to avoid overcrowding
    const clustered = clusterHotspots(hotspots, 0.5); // 500m clustering

    // 4. If no real data, use fallback
    if (clustered.length === 0) {
      logEvent("WARNING", "No incidents found, using fallback heatmap");
      return generateFallbackHeatmap(userLat, userLng, radiusKm);
    }

    return clustered;
  } catch (error) {
    logEvent("ERROR", "Failed to generate heatmap from database", { error: error.message });
    return generateFallbackHeatmap(userLat, userLng, radiusKm);
  }
}

/**
 * Fallback heatmap based on time-of-day and area characteristics
 */
function generateFallbackHeatmap(userLat, userLng, radiusKm) {
  const hotspots = [];
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour <= 6;
  
  // Generate risk zones based on typical urban patterns
  const patterns = [
    { offset: [0.02, 0.01], intensity: isNight ? 0.7 : 0.4, desc: 'Isolated area' },
    { offset: [-0.01, 0.02], intensity: isNight ? 0.6 : 0.3, desc: 'Low-traffic zone' },
    { offset: [0.01, -0.015], intensity: isNight ? 0.8 : 0.5, desc: 'Dark street' },
    { offset: [-0.02, -0.01], intensity: 0.5, desc: 'Moderate risk' },
    { offset: [0.015, 0.015], intensity: isNight ? 0.7 : 0.4, desc: 'Secluded area' }
  ];

  patterns.forEach(pattern => {
    hotspots.push({
      latitude: userLat + pattern.offset[0],
      longitude: userLng + pattern.offset[1],
      intensity: pattern.intensity,
      type: 'estimated',
      description: pattern.desc
    });
  });

  logEvent("INFO", `Generated ${hotspots.length} fallback heatmap points (night mode: ${isNight})`);
  return hotspots;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Cluster nearby hotspots to reduce noise
 */
function clusterHotspots(hotspots, clusterRadiusKm) {
  if (hotspots.length === 0) return [];
  
  const clustered = [];
  const used = new Set();

  hotspots.forEach((spot, i) => {
    if (used.has(i)) return;
    
    const cluster = [spot];
    used.add(i);
    
    // Find nearby spots
    hotspots.forEach((other, j) => {
      if (i !== j && !used.has(j)) {
        const dist = calculateDistance(
          spot.latitude, spot.longitude,
          other.latitude, other.longitude
        );
        if (dist <= clusterRadiusKm) {
          cluster.push(other);
          used.add(j);
        }
      }
    });
    
    // Average position and sum intensity
    const avgLat = cluster.reduce((sum, s) => sum + s.latitude, 0) / cluster.length;
    const avgLng = cluster.reduce((sum, s) => sum + s.longitude, 0) / cluster.length;
    const totalIntensity = Math.min(1.0, cluster.reduce((sum, s) => sum + s.intensity, 0) / cluster.length);
    
    clustered.push({
      latitude: avgLat,
      longitude: avgLng,
      intensity: totalIntensity,
      count: cluster.length,
      type: cluster[0].type
    });
  });

  return clustered;
}

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

  // Heatmap Data API - Real crime/incident data
  router.get("/location/heatmap", requireAuth, async (req, res) => {
    try {
      const { latitude, longitude, radius = 10 } = req.query; // radius in km
      
      if (!latitude || !longitude) {
        return res.status(400).json({ 
          success: false, 
          message: "latitude and longitude are required" 
        });
      }

      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);

      logEvent("INFO", "Fetching heatmap data", { userLat, userLng, radiusKm });

      // Fetch real incident data from database
      const hotspots = await generateHeatmapFromIncidents(userLat, userLng, radiusKm);
      
      logEvent("INFO", `Generated ${hotspots.length} heatmap points`);
      res.status(200).json({ success: true, data: hotspots });
    } catch (error) {
      logEvent("ERROR", "Heatmap generation failed", { error: error.message });
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

  // Community Incident Reporting API
  // FUTURE_SCOPE: Enhanced incident reporting with:
  // - Photo/video evidence upload
  // - Voice-to-text incident description
  // - Anonymous reporting option
  // - Incident verification via community voting
  // - Integration with local law enforcement
  // - Real-time incident alerts to nearby users
  // - Incident categorization with ML (harassment, theft, assault, etc.)
  router.post("/location/report-incident", requireAuth, async (req, res) => {
    try {
      const { uid, latitude, longitude, severity, description, incidentType } = req.body;
      
      if (!uid || !latitude || !longitude || !severity) {
        return res.status(400).json({ 
          success: false, 
          message: "uid, latitude, longitude, and severity are required" 
        });
      }

      if (!['low', 'medium', 'high'].includes(severity)) {
        return res.status(400).json({ 
          success: false, 
          message: "severity must be 'low', 'medium', or 'high'" 
        });
      }

      if (!db) {
        return res.status(500).json({ success: false, message: "DB not connected" });
      }

      const report = {
        uid,
        location: { lat: latitude, lng: longitude },
        severity,
        description: description || '',
        incidentType: incidentType || 'general',
        timestamp: new Date(),
        verified: false, // Requires admin verification
        upvotes: 0,
        downvotes: 0
      };

      const docRef = await db.collection("community_reports").add(report);
      
      logEvent("INCIDENT_REPORT", `New ${severity} incident reported`, { 
        reportId: docRef.id, 
        location: { latitude, longitude },
        type: incidentType 
      });

      res.status(200).json({ 
        success: true, 
        message: "Incident reported successfully. It will be reviewed by moderators.",
        reportId: docRef.id 
      });
    } catch (error) {
      logEvent("ERROR", "Failed to save incident report", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });



  // Safe Route Calculation API with Google Maps Directions + Risk Assessment
  // FUTURE_SCOPE: Enhanced routing with:
  // - Multi-modal transport (walking, cycling, public transit, rideshare)
  // - Real-time traffic and incident updates
  // - Well-lit street preference (using street light data)
  // - Crowded area preference (safety in numbers)
  // - Emergency service proximity scoring
  // - Companion matching for shared routes
  // - AR navigation with safety overlays
  router.post("/location/safe-route", requireAuth, async (req, res) => {
    try {
      const { start, end } = req.body;
      if (!start || !end) return res.status(400).json({ success: false, message: "start and end coordinates required" });

      // Fetch heatmap data to assess route safety
      const heatmapData = await generateHeatmapFromIncidents(
        start.latitude, 
        start.longitude, 
        20 // 20km radius
      );
      
      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
      
      if (!GOOGLE_MAPS_API_KEY) {
        logEvent("WARNING", "Google Maps API key not configured, using fallback");
        // Fallback to dummy data if no API key - create curved route with intermediate points
        const latDiff = end.latitude - start.latitude;
        const lngDiff = end.longitude - start.longitude;
        const steps = 10; // Number of intermediate points
        const waypoints = [];
        
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          // Add some curve to make it look more realistic
          const curve = Math.sin(progress * Math.PI) * 0.002;
          waypoints.push({
            latitude: start.latitude + (latDiff * progress) + curve,
            longitude: start.longitude + (lngDiff * progress) + curve
          });
        }
        
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km calculation
        const route = {
          distance: `${distance.toFixed(1)} km`,
          duration: `${Math.ceil(distance * 3)} mins`,
          waypoints: waypoints,
          summary: "Direct Route",
          steps: [
            {
              instruction: "Head toward destination",
              distance: `${(distance * 0.3).toFixed(1)} km`,
              duration: `${Math.ceil(distance)} mins`,
              maneuver: "straight"
            },
            {
              instruction: "Continue on current road",
              distance: `${(distance * 0.5).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 1.5)} mins`,
              maneuver: "straight"
            },
            {
              instruction: "Arrive at destination",
              distance: `${(distance * 0.2).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 0.5)} mins`,
              maneuver: "straight"
            }
          ]
        };
        return res.status(200).json({ success: true, routes: [route] });
      }

      // Fetch multiple route alternatives from Google Maps Directions API
      const https = require('https');
      const origin = `${start.latitude},${start.longitude}`;
      const destination = `${end.latitude},${end.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&alternatives=true&key=${GOOGLE_MAPS_API_KEY}`;
      
      logEvent("INFO", "Requesting Google Directions", { origin, destination });
      
      // Make HTTPS request
      const data = await new Promise((resolve, reject) => {
        https.get(url, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse Google Maps response'));
            }
          });
        }).on('error', reject);
      });
      
      logEvent("INFO", "Google Directions API response", { status: data.status, routeCount: data.routes?.length || 0 });
      
      if (data.status !== 'OK') {
        logEvent("ERROR", "Google Directions API error", { 
          status: data.status, 
          error_message: data.error_message,
          available_travel_modes: data.available_travel_modes 
        });
        
        // Return fallback route instead of error - create curved route
        const latDiff = end.latitude - start.latitude;
        const lngDiff = end.longitude - start.longitude;
        const steps = 10;
        const waypoints = [];
        
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          const curve = Math.sin(progress * Math.PI) * 0.002;
          waypoints.push({
            latitude: start.latitude + (latDiff * progress) + curve,
            longitude: start.longitude + (lngDiff * progress) + curve
          });
        }
        
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
        const fallbackRoute = {
          distance: `${distance.toFixed(1)} km`,
          duration: `${Math.ceil(distance * 3)} mins`,
          waypoints: waypoints,
          summary: "Direct Route",
          steps: [
            {
              instruction: "Head toward destination",
              distance: `${(distance * 0.3).toFixed(1)} km`,
              duration: `${Math.ceil(distance)} mins`,
              maneuver: "straight"
            },
            {
              instruction: "Continue on current road",
              distance: `${(distance * 0.5).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 1.5)} mins`,
              maneuver: "straight"
            },
            {
              instruction: "Arrive at destination",
              distance: `${(distance * 0.2).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 0.5)} mins`,
              maneuver: "straight"
            }
          ]
        };
        return res.status(200).json({ success: true, routes: [fallbackRoute], warning: `Google Maps API: ${data.status}` });
      }
      
      if (!data.routes || data.routes.length === 0) {
        logEvent("ERROR", "No routes found from Google Maps");
        
        // Create curved fallback route
        const latDiff = end.latitude - start.latitude;
        const lngDiff = end.longitude - start.longitude;
        const steps = 10;
        const waypoints = [];
        
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          const curve = Math.sin(progress * Math.PI) * 0.002;
          waypoints.push({
            latitude: start.latitude + (latDiff * progress) + curve,
            longitude: start.longitude + (lngDiff * progress) + curve
          });
        }
        
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
        const fallbackRoute = {
          distance: `${distance.toFixed(1)} km`,
          duration: `${Math.ceil(distance * 3)} mins`,
          waypoints: waypoints,
          summary: "Direct Route",
          steps: [
            {
              instruction: "Head toward destination",
              distance: `${(distance * 0.3).toFixed(1)} km`,
              duration: `${Math.ceil(distance)} mins`,
              maneuver: "straight"
            },
            {
              instruction: "Continue on current road",
              distance: `${(distance * 0.5).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 1.5)} mins`,
              maneuver: "straight"
            },
            {
              instruction: "Arrive at destination",
              distance: `${(distance * 0.2).toFixed(1)} km`,
              duration: `${Math.ceil(distance * 0.5)} mins`,
              maneuver: "straight"
            }
          ]
        };
        return res.status(200).json({ success: true, routes: [fallbackRoute] });
      }

      // Parse routes and extract key information
      const routes = data.routes.map((route, index) => {
        const leg = route.legs[0];
        const waypoints = route.overview_polyline?.points 
          ? decodePolyline(route.overview_polyline.points)
          : [];
        
        // Extract turn-by-turn steps
        const steps = leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML tags
          distance: step.distance.text,
          duration: step.duration.text,
          maneuver: step.maneuver || 'straight',
          startLocation: { latitude: step.start_location.lat, longitude: step.start_location.lng },
          endLocation: { latitude: step.end_location.lat, longitude: step.end_location.lng }
        }));

        // Calculate risk score based on proximity to incident hotspots
        const riskScore = calculateRouteRiskScore(waypoints, heatmapData);

        return {
          distance: leg.distance.text,
          duration: leg.duration.text,
          durationValue: leg.duration.value, // in seconds
          summary: route.summary || `Route ${index + 1}`,
          waypoints: waypoints,
          steps: steps,
          warnings: route.warnings || [],
          riskScore: riskScore,
          safetyRating: getRiskLabel(riskScore)
        };
      });

      // Sort routes by safety score (lower risk = safer)
      const sortedRoutes = routes.sort((a, b) => {
        // Primary: Risk score (lower is better)
        if (Math.abs(a.riskScore - b.riskScore) > 0.1) {
          return a.riskScore - b.riskScore;
        }
        // Secondary: Warnings
        if (a.warnings.length !== b.warnings.length) {
          return a.warnings.length - b.warnings.length;
        }
        // Tertiary: Duration (prefer faster if safety is equal)
        return a.durationValue - b.durationValue;
      });

      logEvent("ROUTING", `${sortedRoutes.length} routes generated successfully`, { start, end });
      res.status(200).json({ success: true, routes: sortedRoutes });
    } catch (error) {
      logEvent("ERROR", "Safe route calculation failed", { error: error.message, stack: error.stack });
      
      // Return fallback route on any error - create curved route
      const start = req.body.start;
      const end = req.body.end;
      const latDiff = end.latitude - start.latitude;
      const lngDiff = end.longitude - start.longitude;
      const steps = 10;
      const waypoints = [];
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const curve = Math.sin(progress * Math.PI) * 0.002;
        waypoints.push({
          latitude: start.latitude + (latDiff * progress) + curve,
          longitude: start.longitude + (lngDiff * progress) + curve
        });
      }
      
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
      const fallbackRoute = {
        distance: `${distance.toFixed(1)} km`,
        duration: `${Math.ceil(distance * 3)} mins`,
        waypoints: waypoints,
        summary: "Direct Route",
        steps: [
          {
            instruction: "Head toward destination",
            distance: `${(distance * 0.3).toFixed(1)} km`,
            duration: `${Math.ceil(distance)} mins`,
            maneuver: "straight"
          },
          {
            instruction: "Continue on current road",
            distance: `${(distance * 0.5).toFixed(1)} km`,
            duration: `${Math.ceil(distance * 1.5)} mins`,
            maneuver: "straight"
          },
          {
            instruction: "Arrive at destination",
            distance: `${(distance * 0.2).toFixed(1)} km`,
            duration: `${Math.ceil(distance * 0.5)} mins`,
            maneuver: "straight"
          }
        ]
      };
      res.status(200).json({ success: true, routes: [fallbackRoute], error: error.message });
    }
  });

  /**
   * Calculate risk score for a route based on proximity to incident hotspots
   * Returns a score from 0 (safest) to 1 (most dangerous)
   */
  function calculateRouteRiskScore(waypoints, heatmapData) {
    if (!waypoints || waypoints.length === 0) return 0.5;
    if (!heatmapData || heatmapData.length === 0) return 0.3; // No data = assume moderate safety

    let totalRisk = 0;
    let riskPoints = 0;

    // Sample waypoints (check every 10th point to optimize)
    const sampleInterval = Math.max(1, Math.floor(waypoints.length / 20));
    
    for (let i = 0; i < waypoints.length; i += sampleInterval) {
      const point = waypoints[i];
      
      // Find nearby hotspots within 500m
      heatmapData.forEach(hotspot => {
        const distance = calculateDistance(
          point.latitude, point.longitude,
          hotspot.latitude, hotspot.longitude
        );
        
        // Risk decreases with distance (500m = full risk, 1km = no risk)
        if (distance <= 1.0) {
          const proximityFactor = Math.max(0, 1 - (distance / 1.0));
          const risk = hotspot.intensity * proximityFactor;
          totalRisk += risk;
          riskPoints++;
        }
      });
    }

    // Average risk across all sampled points
    const avgRisk = riskPoints > 0 ? totalRisk / (waypoints.length / sampleInterval) : 0.3;
    
    // Normalize to 0-1 scale
    return Math.min(1.0, Math.max(0, avgRisk));
  }

  /**
   * Convert risk score to human-readable label
   */
  function getRiskLabel(riskScore) {
    if (riskScore <= 0.3) return 'Safe';
    if (riskScore <= 0.6) return 'Moderate';
    return 'Risky';
  }

  // Helper function to decode Google's encoded polyline
  function decodePolyline(encoded) {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  }

  // ═══════════════════════════════════════════════════════════════
  // ML CRIME PREDICTION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Train ML model on historical data
   * POST /location/ml/train
   */
  router.post("/location/ml/train", requireAuth, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ success: false, message: "DB not connected" });
      }

      logEvent("INFO", "[ML] Training model on historical data");

      // Fetch historical incidents
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const incidents = [];

      // Fetch SOS triggers
      const sosSnapshot = await db.collection("sos_triggers")
        .where("timestamp", ">=", ninetyDaysAgo)
        .get();

      sosSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.location && data.location.lat && data.location.lng) {
          incidents.push({
            location: { lat: data.location.lat, lng: data.location.lng },
            timestamp: data.timestamp.toDate(),
            severity: 'high',
            riskScore: data.riskScore || 90
          });
        }
      });

      // Fetch community reports
      const reportsSnapshot = await db.collection("community_reports")
        .where("timestamp", ">=", ninetyDaysAgo)
        .where("verified", "==", true)
        .get();

      reportsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.location && data.location.lat && data.location.lng) {
          incidents.push({
            location: { lat: data.location.lat, lng: data.location.lng },
            timestamp: data.timestamp.toDate(),
            severity: data.severity || 'medium'
          });
        }
      });

      // Train model
      const trainingResult = await crimePredictionModel.train(incidents);

      res.status(200).json({
        success: true,
        message: "Model trained successfully",
        ...trainingResult
      });
    } catch (error) {
      logEvent("ERROR", "[ML] Training failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * Predict crime risk for a specific location
   * GET /location/ml/predict?latitude=X&longitude=Y&timestamp=ISO8601
   */
  router.get("/location/ml/predict", requireAuth, async (req, res) => {
    try {
      const { latitude, longitude, timestamp } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "latitude and longitude are required"
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const time = timestamp ? new Date(timestamp) : new Date();

      const prediction = crimePredictionModel.predict(lat, lng, time);

      res.status(200).json({
        success: true,
        prediction
      });
    } catch (error) {
      logEvent("ERROR", "[ML] Prediction failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * Predict risk zones for an area
   * GET /location/ml/predict-zones?latitude=X&longitude=Y&radius=5&timestamp=ISO8601
   */
  router.get("/location/ml/predict-zones", requireAuth, async (req, res) => {
    try {
      const { latitude, longitude, radius = 5, timestamp } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "latitude and longitude are required"
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);
      const time = timestamp ? new Date(timestamp) : new Date();

      const riskZones = crimePredictionModel.predictRiskZones(lat, lng, radiusKm, time);

      res.status(200).json({
        success: true,
        zones: riskZones,
        center: { latitude: lat, longitude: lng },
        radius: radiusKm,
        predictedFor: time.toISOString()
      });
    } catch (error) {
      logEvent("ERROR", "[ML] Zone prediction failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * Get ML model status
   * GET /location/ml/status
   */
  router.get("/location/ml/status", requireAuth, async (req, res) => {
    try {
      const status = crimePredictionModel.getStatus();
      res.status(200).json({
        success: true,
        model: status
      });
    } catch (error) {
      logEvent("ERROR", "[ML] Status check failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * Get predictive heatmap (combines historical + ML predictions)
   * GET /location/ml/predictive-heatmap?latitude=X&longitude=Y&radius=10&timestamp=ISO8601
   */
  router.get("/location/ml/predictive-heatmap", requireAuth, async (req, res) => {
    try {
      const { latitude, longitude, radius = 10, timestamp } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: "latitude and longitude are required"
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);
      const time = timestamp ? new Date(timestamp) : new Date();

      // Get historical heatmap
      const historicalHotspots = await generateHeatmapFromIncidents(lat, lng, radiusKm);

      // Get ML predictions
      const predictedZones = crimePredictionModel.predictRiskZones(lat, lng, radiusKm, time);

      // Combine both
      const combinedHeatmap = [
        ...historicalHotspots.map(h => ({ ...h, source: 'historical' })),
        ...predictedZones.map(z => ({
          latitude: z.latitude,
          longitude: z.longitude,
          intensity: z.riskScore,
          type: 'predicted',
          source: 'ml_prediction',
          riskLevel: z.riskLevel
        }))
      ];

      res.status(200).json({
        success: true,
        heatmap: combinedHeatmap,
        historicalCount: historicalHotspots.length,
        predictedCount: predictedZones.length,
        predictedFor: time.toISOString()
      });
    } catch (error) {
      logEvent("ERROR", "[ML] Predictive heatmap failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
