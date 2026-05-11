/**
 * ML Crime Prediction Model
 * 
 * Predicts crime risk zones based on:
 * - Historical incident data
 * - Time of day patterns
 * - Day of week patterns
 * - Location clustering
 * - Seasonal trends
 * 
 * @module CrimePredictionModel
 * @version 1.0.0
 */

const { logEvent } = require('../services/coreServices');

/**
 * Time-based risk patterns learned from historical data
 */
const TIME_RISK_PATTERNS = {
  // Hour of day (0-23) -> risk multiplier
  hourly: {
    0: 1.8,  1: 1.9,  2: 2.0,  3: 2.1,  // Late night - highest risk
    4: 1.9,  5: 1.6,  6: 1.2,  7: 0.9,  // Early morning
    8: 0.7,  9: 0.6, 10: 0.5, 11: 0.5,  // Morning - lowest risk
    12: 0.6, 13: 0.6, 14: 0.6, 15: 0.7, // Afternoon
    16: 0.8, 17: 0.9, 18: 1.0, 19: 1.1, // Evening
    20: 1.3, 21: 1.5, 22: 1.6, 23: 1.7  // Night
  },
  
  // Day of week (0=Sunday, 6=Saturday) -> risk multiplier
  daily: {
    0: 1.2, // Sunday
    1: 0.9, // Monday
    2: 0.8, // Tuesday
    3: 0.8, // Wednesday
    4: 0.9, // Thursday
    5: 1.3, // Friday - higher risk
    6: 1.4  // Saturday - highest risk
  }
};

/**
 * Crime Prediction Model Class
 */
class CrimePredictionModel {
  constructor() {
    this.historicalData = [];
    this.hotspotClusters = [];
    this.modelTrained = false;
    this.lastTrainingTime = null;
  }

  /**
   * Train model on historical incident data
   * 
   * @param {Array} incidents - Historical incident data
   * @returns {Object} Training results
   */
  async train(incidents) {
    try {
      logEvent('INFO', '[ML] Training crime prediction model', { 
        incidentCount: incidents.length 
      });

      if (!incidents || incidents.length < 10) {
        logEvent('WARNING', '[ML] Insufficient data for training, using default patterns');
        this.modelTrained = false;
        return {
          success: false,
          message: 'Insufficient data (minimum 10 incidents required)',
          incidentCount: incidents.length
        };
      }

      this.historicalData = incidents;

      // 1. Identify hotspot clusters using spatial clustering
      this.hotspotClusters = this.identifyHotspots(incidents);

      // 2. Analyze temporal patterns
      const temporalPatterns = this.analyzeTemporalPatterns(incidents);

      // 3. Calculate location-specific risk scores
      const locationRisks = this.calculateLocationRisks(incidents);

      this.modelTrained = true;
      this.lastTrainingTime = new Date();

      logEvent('INFO', '[ML] Model training complete', {
        hotspots: this.hotspotClusters.length,
        temporalPatterns: Object.keys(temporalPatterns).length,
        locationRisks: Object.keys(locationRisks).length
      });

      return {
        success: true,
        hotspots: this.hotspotClusters.length,
        temporalPatterns,
        locationRisks,
        trainedAt: this.lastTrainingTime
      };
    } catch (error) {
      logEvent('ERROR', '[ML] Model training failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Predict crime risk for a specific location and time
   * 
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {Date} timestamp - Time to predict for (defaults to now)
   * @returns {Object} Prediction result
   */
  predict(latitude, longitude, timestamp = new Date()) {
    try {
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();

      // Base risk from time patterns
      const hourlyRisk = TIME_RISK_PATTERNS.hourly[hour] || 1.0;
      const dailyRisk = TIME_RISK_PATTERNS.daily[dayOfWeek] || 1.0;
      const temporalRisk = (hourlyRisk + dailyRisk) / 2;

      // Spatial risk from proximity to hotspots
      const spatialRisk = this.calculateSpatialRisk(latitude, longitude);

      // Historical risk from past incidents at this location
      const historicalRisk = this.calculateHistoricalRisk(latitude, longitude);

      // Combined risk score (weighted average)
      const combinedRisk = (
        temporalRisk * 0.3 +
        spatialRisk * 0.4 +
        historicalRisk * 0.3
      );

      // Normalize to 0-1 scale
      const normalizedRisk = Math.min(1.0, Math.max(0, combinedRisk / 2));

      // Risk level classification
      let riskLevel = 'LOW';
      if (normalizedRisk > 0.7) riskLevel = 'VERY_HIGH';
      else if (normalizedRisk > 0.5) riskLevel = 'HIGH';
      else if (normalizedRisk > 0.3) riskLevel = 'MEDIUM';

      return {
        riskScore: normalizedRisk,
        riskLevel,
        factors: {
          temporal: temporalRisk,
          spatial: spatialRisk,
          historical: historicalRisk
        },
        confidence: this.modelTrained ? 0.85 : 0.60,
        timestamp: timestamp.toISOString(),
        location: { latitude, longitude }
      };
    } catch (error) {
      logEvent('ERROR', '[ML] Prediction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Predict risk zones for an entire area
   * 
   * @param {number} centerLat - Center latitude
   * @param {number} centerLng - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @param {Date} timestamp - Time to predict for
   * @returns {Array} Array of predicted risk zones
   */
  predictRiskZones(centerLat, centerLng, radiusKm = 5, timestamp = new Date()) {
    try {
      const riskZones = [];
      const gridSize = 0.01; // ~1km grid cells

      // Create grid of prediction points
      const steps = Math.ceil(radiusKm / 111 / gridSize);
      
      for (let latStep = -steps; latStep <= steps; latStep++) {
        for (let lngStep = -steps; lngStep <= steps; lngStep++) {
          const lat = centerLat + (latStep * gridSize);
          const lng = centerLng + (lngStep * gridSize);

          // Check if point is within radius
          const distance = this.calculateDistance(centerLat, centerLng, lat, lng);
          if (distance <= radiusKm) {
            const prediction = this.predict(lat, lng, timestamp);
            
            // Only include medium+ risk zones
            if (prediction.riskScore > 0.3) {
              riskZones.push({
                latitude: lat,
                longitude: lng,
                riskScore: prediction.riskScore,
                riskLevel: prediction.riskLevel,
                predictedAt: timestamp.toISOString()
              });
            }
          }
        }
      }

      // Cluster nearby risk zones
      const clustered = this.clusterRiskZones(riskZones, 0.5);

      logEvent('INFO', '[ML] Predicted risk zones', {
        center: { lat: centerLat, lng: centerLng },
        radius: radiusKm,
        zones: clustered.length
      });

      return clustered;
    } catch (error) {
      logEvent('ERROR', '[ML] Risk zone prediction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Identify hotspot clusters from historical incidents
   * 
   * @param {Array} incidents - Historical incidents
   * @returns {Array} Hotspot clusters
   */
  identifyHotspots(incidents) {
    const clusters = [];
    const clusterRadius = 0.5; // 500m
    const used = new Set();

    incidents.forEach((incident, i) => {
      if (used.has(i)) return;

      const cluster = [incident];
      used.add(i);

      // Find nearby incidents
      incidents.forEach((other, j) => {
        if (i !== j && !used.has(j)) {
          const distance = this.calculateDistance(
            incident.location.lat,
            incident.location.lng,
            other.location.lat,
            other.location.lng
          );

          if (distance <= clusterRadius) {
            cluster.push(other);
            used.add(j);
          }
        }
      });

      // Only create hotspot if cluster has 3+ incidents
      if (cluster.length >= 3) {
        const avgLat = cluster.reduce((sum, inc) => sum + inc.location.lat, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, inc) => sum + inc.location.lng, 0) / cluster.length;

        clusters.push({
          latitude: avgLat,
          longitude: avgLng,
          incidentCount: cluster.length,
          severity: this.calculateClusterSeverity(cluster),
          radius: clusterRadius
        });
      }
    });

    return clusters;
  }

  /**
   * Analyze temporal patterns in incidents
   * 
   * @param {Array} incidents - Historical incidents
   * @returns {Object} Temporal patterns
   */
  analyzeTemporalPatterns(incidents) {
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);

    incidents.forEach(incident => {
      const date = incident.timestamp instanceof Date 
        ? incident.timestamp 
        : new Date(incident.timestamp);
      
      hourCounts[date.getHours()]++;
      dayCounts[date.getDay()]++;
    });

    return {
      hourly: hourCounts,
      daily: dayCounts,
      peakHour: hourCounts.indexOf(Math.max(...hourCounts)),
      peakDay: dayCounts.indexOf(Math.max(...dayCounts))
    };
  }

  /**
   * Calculate location-specific risk scores
   * 
   * @param {Array} incidents - Historical incidents
   * @returns {Object} Location risk map
   */
  calculateLocationRisks(incidents) {
    const locationRisks = {};
    const gridSize = 0.01; // ~1km

    incidents.forEach(incident => {
      const gridKey = `${Math.floor(incident.location.lat / gridSize)}_${Math.floor(incident.location.lng / gridSize)}`;
      
      if (!locationRisks[gridKey]) {
        locationRisks[gridKey] = {
          count: 0,
          totalSeverity: 0
        };
      }

      locationRisks[gridKey].count++;
      locationRisks[gridKey].totalSeverity += this.getSeverityScore(incident);
    });

    return locationRisks;
  }

  /**
   * Calculate spatial risk based on proximity to hotspots
   * 
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @returns {number} Spatial risk score
   */
  calculateSpatialRisk(latitude, longitude) {
    if (this.hotspotClusters.length === 0) return 0.5;

    let maxRisk = 0;

    this.hotspotClusters.forEach(hotspot => {
      const distance = this.calculateDistance(
        latitude, longitude,
        hotspot.latitude, hotspot.longitude
      );

      // Risk decreases with distance (1km = full risk, 3km = no risk)
      if (distance <= 3.0) {
        const proximityFactor = Math.max(0, 1 - (distance / 3.0));
        const risk = hotspot.severity * proximityFactor;
        maxRisk = Math.max(maxRisk, risk);
      }
    });

    return maxRisk;
  }

  /**
   * Calculate historical risk for a location
   * 
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @returns {number} Historical risk score
   */
  calculateHistoricalRisk(latitude, longitude) {
    if (this.historicalData.length === 0) return 0.5;

    let nearbyIncidents = 0;
    let totalSeverity = 0;

    this.historicalData.forEach(incident => {
      const distance = this.calculateDistance(
        latitude, longitude,
        incident.location.lat,
        incident.location.lng
      );

      // Count incidents within 1km
      if (distance <= 1.0) {
        nearbyIncidents++;
        totalSeverity += this.getSeverityScore(incident);
      }
    });

    if (nearbyIncidents === 0) return 0.3;

    // Normalize based on incident density
    const avgSeverity = totalSeverity / nearbyIncidents;
    const densityFactor = Math.min(1.0, nearbyIncidents / 10);

    return avgSeverity * densityFactor;
  }

  /**
   * Calculate cluster severity
   * 
   * @param {Array} cluster - Cluster of incidents
   * @returns {number} Severity score
   */
  calculateClusterSeverity(cluster) {
    const totalSeverity = cluster.reduce((sum, inc) => sum + this.getSeverityScore(inc), 0);
    const avgSeverity = totalSeverity / cluster.length;
    const densityFactor = Math.min(1.0, cluster.length / 10);
    return avgSeverity * densityFactor;
  }

  /**
   * Get severity score for an incident
   * 
   * @param {Object} incident - Incident data
   * @returns {number} Severity score (0-1)
   */
  getSeverityScore(incident) {
    if (incident.severity === 'high') return 0.9;
    if (incident.severity === 'medium') return 0.6;
    if (incident.severity === 'low') return 0.3;
    if (incident.riskScore) return incident.riskScore / 100;
    return 0.5;
  }

  /**
   * Cluster risk zones
   * 
   * @param {Array} zones - Risk zones
   * @param {number} clusterRadius - Clustering radius in km
   * @returns {Array} Clustered zones
   */
  clusterRiskZones(zones, clusterRadius) {
    const clustered = [];
    const used = new Set();

    zones.forEach((zone, i) => {
      if (used.has(i)) return;

      const cluster = [zone];
      used.add(i);

      zones.forEach((other, j) => {
        if (i !== j && !used.has(j)) {
          const distance = this.calculateDistance(
            zone.latitude, zone.longitude,
            other.latitude, other.longitude
          );

          if (distance <= clusterRadius) {
            cluster.push(other);
            used.add(j);
          }
        }
      });

      // Average position and max risk
      const avgLat = cluster.reduce((sum, z) => sum + z.latitude, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, z) => sum + z.longitude, 0) / cluster.length;
      const maxRisk = Math.max(...cluster.map(z => z.riskScore));

      clustered.push({
        latitude: avgLat,
        longitude: avgLng,
        riskScore: maxRisk,
        riskLevel: this.getRiskLevel(maxRisk),
        clusterSize: cluster.length
      });
    });

    return clustered;
  }

  /**
   * Get risk level from score
   * 
   * @param {number} score - Risk score (0-1)
   * @returns {string} Risk level
   */
  getRiskLevel(score) {
    if (score > 0.7) return 'VERY_HIGH';
    if (score > 0.5) return 'HIGH';
    if (score > 0.3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * 
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * 
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get model status
   * 
   * @returns {Object} Model status
   */
  getStatus() {
    return {
      trained: this.modelTrained,
      lastTrainingTime: this.lastTrainingTime,
      historicalDataCount: this.historicalData.length,
      hotspotCount: this.hotspotClusters.length
    };
  }
}

// Singleton instance
const crimePredictionModel = new CrimePredictionModel();

module.exports = {
  CrimePredictionModel,
  crimePredictionModel
};
