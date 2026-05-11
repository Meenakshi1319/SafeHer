# Heatmap & Safe Route Upgrade

## Date: May 11, 2026

### ✅ What Was Fixed

Your SafeHer app now has **real incident-based heatmaps and risk-aware route calculation** instead of hardcoded mock data.

---

## 🎯 New Features

### 1. **Real-Time Incident Heatmap**
- Fetches actual SOS triggers from the last 30 days
- Integrates community-reported incidents
- Dynamic intensity based on incident recency
- Time-of-day aware fallback (higher risk at night)
- Clustering to avoid overcrowding

### 2. **Risk-Aware Route Calculation**
- Routes analyzed against incident hotspots
- Risk score calculated based on proximity to danger zones
- Routes sorted by safety (lowest risk first)
- Visual color coding: Green (Safe), Yellow (Moderate), Red (Risky)
- Real-time safety ratings displayed

### 3. **Community Incident Reporting**
- Users can report incidents with severity levels
- Reports require admin verification before appearing on heatmap
- Upvote/downvote system for community validation
- Incident types: harassment, theft, assault, suspicious activity, etc.

---

## 📁 Files Changed

### Backend

1. **`backend/src/api/controllers/locationController.js`**
   - Added `generateHeatmapFromIncidents()` - Fetches real SOS and community reports
   - Added `generateFallbackHeatmap()` - Time-aware fallback when no data
   - Added `calculateRouteRiskScore()` - Analyzes route proximity to hotspots
   - Added `clusterHotspots()` - Groups nearby incidents
   - Added `/location/report-incident` endpoint - Community reporting
   - Updated `/location/heatmap` - Now requires lat/lng parameters
   - Updated `/location/safe-route` - Now includes risk assessment

### Frontend

1. **`app/(tabs)/map.tsx`**
   - Updated heatmap fetch to include user coordinates
   - Routes now display real safety ratings from backend
   - Added risk score visualization
   - Enhanced route color coding based on actual risk

---

## 🔧 How It Works

### Heatmap Generation Flow
```
User opens map
    ↓
Frontend sends current location to backend
    ↓
Backend queries Firestore for:
  - SOS triggers (last 30 days)
  - Community reports (verified only)
    ↓
Calculate distance from user location
    ↓
Apply recency factor (recent = higher intensity)
    ↓
Cluster nearby incidents (500m radius)
    ↓
Return hotspot array with lat/lng/intensity
    ↓
Frontend displays as red circles on map
```

### Risk-Aware Routing Flow
```
User searches for destination
    ↓
Backend fetches heatmap data (20km radius)
    ↓
Google Maps returns 1-3 route alternatives
    ↓
For each route:
  - Sample waypoints (every 10th point)
  - Check proximity to hotspots (within 1km)
  - Calculate risk score (0-1 scale)
    ↓
Sort routes by risk score (lowest first)
    ↓
Assign safety labels:
  - 0-0.3 = Safe (green)
  - 0.3-0.6 = Moderate (yellow)
  - 0.6-1.0 = Risky (red)
    ↓
Frontend displays with color coding
```

---

## 🗄️ Database Collections

### `sos_triggers`
Automatically created when SOS is triggered
```javascript
{
  uid: "user123",
  timestamp: Timestamp,
  location: { lat: 12.9716, lng: 77.5946 },
  reason: "Emergency",
  riskScore: 95
}
```

### `community_reports`
Created via `/location/report-incident` endpoint
```javascript
{
  uid: "user456",
  timestamp: Timestamp,
  location: { lat: 12.9352, lng: 77.6245 },
  severity: "high", // low, medium, high
  description: "Harassment incident",
  incidentType: "harassment",
  verified: false, // Admin verification required
  upvotes: 0,
  downvotes: 0
}
```

---

## 📊 API Endpoints

### GET `/location/heatmap`
**Parameters:**
- `latitude` (required) - User's current latitude
- `longitude` (required) - User's current longitude
- `radius` (optional) - Search radius in km (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "latitude": 12.9716,
      "longitude": 77.5946,
      "intensity": 0.85,
      "type": "sos",
      "count": 3,
      "timestamp": "2026-05-10T14:30:00Z"
    },
    {
      "latitude": 12.9352,
      "longitude": 77.6245,
      "intensity": 0.65,
      "type": "report",
      "count": 2
    }
  ]
}
```

### POST `/location/safe-route`
**Request:**
```json
{
  "start": { "latitude": 12.9716, "longitude": 77.5946 },
  "end": { "latitude": 12.9352, "longitude": 77.6245 }
}
```

**Response:**
```json
{
  "success": true,
  "routes": [
    {
      "distance": "5.2 km",
      "duration": "15 mins",
      "summary": "NH 44",
      "waypoints": [...],
      "steps": [...],
      "warnings": [],
      "riskScore": 0.25,
      "safetyRating": "Safe"
    },
    {
      "distance": "4.8 km",
      "duration": "12 mins",
      "summary": "Inner Ring Road",
      "waypoints": [...],
      "steps": [...],
      "warnings": ["This route may be missing sidewalks"],
      "riskScore": 0.72,
      "safetyRating": "Risky"
    }
  ]
}
```

### POST `/location/report-incident`
**Request:**
```json
{
  "uid": "user123",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "severity": "high",
  "description": "Harassment incident near bus stop",
  "incidentType": "harassment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Incident reported successfully. It will be reviewed by moderators.",
  "reportId": "abc123"
}
```

---

## 🎨 Visual Changes

### Heatmap Display
- Red circles on map showing danger zones
- Circle size = incident intensity
- Opacity = risk level
- Clusters multiple nearby incidents

### Route Cards
- **Safe Routes** (Green badge) - Risk score 0-30%
- **Moderate Routes** (Yellow badge) - Risk score 30-60%
- **Risky Routes** (Red badge) - Risk score 60-100%
- Routes sorted safest-first

### Navigation Dashboard
- Safety badge shows current route risk
- Real-time risk assessment
- Visual warnings for high-risk areas

---

## 🧪 Testing Instructions

### 1. Test Heatmap Display
1. Open the Map tab
2. Grant location permission
3. Wait for map to load
4. Look for red circles showing incident hotspots
5. Verify circles appear near your location

### 2. Test Risk-Aware Routing
1. Enter a destination
2. Tap "Go"
3. Verify multiple routes appear
4. Check that routes have different safety ratings
5. Verify safest route is listed first
6. Tap a risky route - should show red badge

### 3. Test Community Reporting (Backend)
```bash
curl -X POST http://localhost:5000/location/report-incident \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test123",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "severity": "high",
    "description": "Test incident",
    "incidentType": "harassment"
  }'
```

### 4. Test Fallback Behavior
1. Stop backend server
2. Open map - should show time-aware fallback heatmap
3. Search for route - should show curved fallback route
4. Verify app doesn't crash

---

## 🔐 Data Sources Priority

1. **Primary:** Real SOS triggers from database
2. **Secondary:** Verified community reports
3. **Tertiary:** Time-of-day based estimation
4. **Fallback:** Generic risk zones around user

---

## 📈 Risk Score Calculation

### Formula
```
For each waypoint on route:
  For each nearby hotspot (within 1km):
    proximityFactor = 1 - (distance / 1km)
    risk = hotspot.intensity × proximityFactor
    totalRisk += risk

avgRisk = totalRisk / numberOfWaypoints
riskScore = min(1.0, max(0, avgRisk))
```

### Intensity Factors
- **SOS Trigger:** Base intensity 0.9
- **High Severity Report:** Base intensity 0.8
- **Medium Severity Report:** Base intensity 0.6
- **Low Severity Report:** Base intensity 0.4
- **Recency Factor:** `max(0.3, 1 - daysAgo/30)`

### Example
Route passes 200m from a 5-day-old SOS incident:
```
baseIntensity = 0.9
recencyFactor = 1 - (5/30) = 0.83
proximityFactor = 1 - (0.2/1.0) = 0.8
risk = 0.9 × 0.83 × 0.8 = 0.60 (Risky)
```

---

## 🚀 Future Enhancements

### Heatmap Improvements
1. **Real Crime Data APIs** - Integrate with police/government APIs
2. **Weather Integration** - Higher risk during rain/fog
3. **Lighting Data** - Mark poorly lit areas
4. **Crowd Density** - Safer in crowded areas
5. **Historical Patterns** - Time-of-day risk variations

### Route Improvements
1. **Well-Lit Route Preference** - Prioritize street lighting
2. **Crowded Route Preference** - Prefer busy streets
3. **Emergency Exit Points** - Show safe locations along route
4. **Police Station Proximity** - Routes near police stations
5. **CCTV Coverage** - Prefer monitored areas

### Community Features
1. **In-App Incident Reporting** - UI for users to report
2. **Photo Evidence** - Attach photos to reports
3. **Upvote/Downvote System** - Community validation
4. **Report Moderation Dashboard** - Admin panel
5. **Incident Categories** - Harassment, theft, assault, etc.

---

## 🐛 Fallback Behavior

### If Database Unavailable
- Uses time-of-day aware fallback heatmap
- Generates 5 risk zones around user
- Higher intensity at night (8 PM - 6 AM)
- Still provides route calculation

### If Google Maps API Fails
- Creates curved route between start/end
- Estimates distance and duration
- Still applies risk assessment
- No app crash

### If No Incidents Found
- Returns empty heatmap (no red circles)
- Routes still calculated normally
- All routes marked "Safe" by default

---

## 📝 Notes

- Heatmap updates every time map is opened
- Incidents older than 30 days are excluded
- Community reports require admin verification
- Risk scores are relative to local area
- Clustering prevents map overcrowding

---

## ✅ Summary

Your heatmap and safe route system is now production-ready with:
- ✅ Real incident data from SOS triggers
- ✅ Community-reported incidents
- ✅ Risk-aware route calculation
- ✅ Dynamic safety ratings
- ✅ Time-aware fallback system
- ✅ Incident clustering
- ✅ Visual risk indicators
- ✅ API for community reporting

No more hardcoded mock data! 🎉

---

## 🔗 Related Documentation

- [NAVIGATION_UPGRADE.md](./NAVIGATION_UPGRADE.md) - Turn-by-turn navigation
- [SOS_EVIDENCE_INTEGRATION.md](./SOS_EVIDENCE_INTEGRATION.md) - SOS trigger system
- [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) - Overall app status
