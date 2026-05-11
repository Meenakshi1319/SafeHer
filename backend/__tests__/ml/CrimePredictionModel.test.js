/**
 * Crime Prediction Model Tests
 */

const { CrimePredictionModel } = require('../../src/ml/CrimePredictionModel');

describe('CrimePredictionModel', () => {
  let model;

  beforeEach(() => {
    model = new CrimePredictionModel();
  });

  describe('Training', () => {
    test('should train successfully with sufficient data', async () => {
      const incidents = generateMockIncidents(20);
      const result = await model.train(incidents);

      expect(result.success).toBe(true);
      expect(result.hotspots).toBeGreaterThan(0);
      expect(model.modelTrained).toBe(true);
    });

    test('should fail training with insufficient data', async () => {
      const incidents = generateMockIncidents(5);
      const result = await model.train(incidents);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient data');
      expect(model.modelTrained).toBe(false);
    });

    test('should identify hotspot clusters', async () => {
      const incidents = [
        // Cluster 1: 3 incidents near (12.9716, 77.5946)
        { location: { lat: 12.9716, lng: 77.5946 }, timestamp: new Date(), severity: 'high' },
        { location: { lat: 12.9720, lng: 77.5950 }, timestamp: new Date(), severity: 'high' },
        { location: { lat: 12.9712, lng: 77.5942 }, timestamp: new Date(), severity: 'medium' },
        // Cluster 2: 3 incidents near (12.9352, 77.6245)
        { location: { lat: 12.9352, lng: 77.6245 }, timestamp: new Date(), severity: 'high' },
        { location: { lat: 12.9355, lng: 77.6248 }, timestamp: new Date(), severity: 'medium' },
        { location: { lat: 12.9349, lng: 77.6242 }, timestamp: new Date(), severity: 'low' },
        // Isolated incidents (should not form clusters)
        { location: { lat: 13.0000, lng: 77.7000 }, timestamp: new Date(), severity: 'low' },
        { location: { lat: 13.1000, lng: 77.8000 }, timestamp: new Date(), severity: 'low' },
        { location: { lat: 13.2000, lng: 77.9000 }, timestamp: new Date(), severity: 'low' },
        { location: { lat: 13.3000, lng: 78.0000 }, timestamp: new Date(), severity: 'low' }
      ];

      await model.train(incidents);

      expect(model.hotspotClusters.length).toBeGreaterThanOrEqual(2);
      expect(model.hotspotClusters[0].incidentCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Prediction', () => {
    beforeEach(async () => {
      const incidents = generateMockIncidents(20);
      await model.train(incidents);
    });

    test('should predict risk for a location', () => {
      const prediction = model.predict(12.9716, 77.5946);

      expect(prediction).toHaveProperty('riskScore');
      expect(prediction).toHaveProperty('riskLevel');
      expect(prediction).toHaveProperty('factors');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScore).toBeLessThanOrEqual(1);
    });

    test('should classify risk levels correctly', () => {
      // Test different times of day
      const morningPrediction = model.predict(12.9716, 77.5946, new Date('2026-05-11T10:00:00'));
      const nightPrediction = model.predict(12.9716, 77.5946, new Date('2026-05-11T02:00:00'));

      // Night should have higher risk than morning
      expect(nightPrediction.riskScore).toBeGreaterThan(morningPrediction.riskScore);
    });

    test('should return correct risk level labels', () => {
      const lowRisk = model.predict(13.5000, 78.5000); // Far from incidents
      const highRisk = model.predict(12.9716, 77.5946, new Date('2026-05-11T02:00:00')); // Near incidents at night

      expect(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).toContain(lowRisk.riskLevel);
      expect(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).toContain(highRisk.riskLevel);
    });

    test('should include prediction factors', () => {
      const prediction = model.predict(12.9716, 77.5946);

      expect(prediction.factors).toHaveProperty('temporal');
      expect(prediction.factors).toHaveProperty('spatial');
      expect(prediction.factors).toHaveProperty('historical');
      expect(prediction.factors.temporal).toBeGreaterThan(0);
    });
  });

  describe('Risk Zone Prediction', () => {
    beforeEach(async () => {
      const incidents = generateMockIncidents(30);
      await model.train(incidents);
    });

    test('should predict risk zones for an area', () => {
      const zones = model.predictRiskZones(12.9716, 77.5946, 5);

      expect(Array.isArray(zones)).toBe(true);
      zones.forEach(zone => {
        expect(zone).toHaveProperty('latitude');
        expect(zone).toHaveProperty('longitude');
        expect(zone).toHaveProperty('riskScore');
        expect(zone).toHaveProperty('riskLevel');
      });
    });

    test('should only include medium+ risk zones', () => {
      const zones = model.predictRiskZones(12.9716, 77.5946, 5);

      zones.forEach(zone => {
        expect(zone.riskScore).toBeGreaterThan(0.3);
      });
    });

    test('should cluster nearby risk zones', () => {
      const zones = model.predictRiskZones(12.9716, 77.5946, 10);

      // Zones should be clustered (fewer zones than grid cells)
      expect(zones.length).toBeLessThan(100);
    });
  });

  describe('Temporal Patterns', () => {
    test('should have higher risk at night', () => {
      const morningRisk = model.predict(12.9716, 77.5946, new Date('2026-05-11T10:00:00'));
      const nightRisk = model.predict(12.9716, 77.5946, new Date('2026-05-11T02:00:00'));

      expect(nightRisk.factors.temporal).toBeGreaterThan(morningRisk.factors.temporal);
    });

    test('should have higher risk on weekends', () => {
      const weekdayRisk = model.predict(12.9716, 77.5946, new Date('2026-05-12T20:00:00')); // Tuesday
      const weekendRisk = model.predict(12.9716, 77.5946, new Date('2026-05-16T20:00:00')); // Saturday

      expect(weekendRisk.factors.temporal).toBeGreaterThan(weekdayRisk.factors.temporal);
    });
  });

  describe('Spatial Risk Calculation', () => {
    beforeEach(async () => {
      const incidents = [
        { location: { lat: 12.9716, lng: 77.5946 }, timestamp: new Date(), severity: 'high' },
        { location: { lat: 12.9720, lng: 77.5950 }, timestamp: new Date(), severity: 'high' },
        { location: { lat: 12.9712, lng: 77.5942 }, timestamp: new Date(), severity: 'high' }
      ];
      await model.train(incidents);
    });

    test('should have higher spatial risk near hotspots', () => {
      const nearHotspot = model.calculateSpatialRisk(12.9716, 77.5946);
      const farFromHotspot = model.calculateSpatialRisk(13.5000, 78.5000);

      expect(nearHotspot).toBeGreaterThan(farFromHotspot);
    });

    test('should decrease risk with distance', () => {
      const veryClose = model.calculateSpatialRisk(12.9716, 77.5946);
      const close = model.calculateSpatialRisk(12.9800, 77.6000);
      const far = model.calculateSpatialRisk(13.0000, 77.7000);

      expect(veryClose).toBeGreaterThan(close);
      expect(close).toBeGreaterThan(far);
    });
  });

  describe('Model Status', () => {
    test('should return untrained status initially', () => {
      const status = model.getStatus();

      expect(status.trained).toBe(false);
      expect(status.lastTrainingTime).toBeNull();
      expect(status.historicalDataCount).toBe(0);
      expect(status.hotspotCount).toBe(0);
    });

    test('should return trained status after training', async () => {
      const incidents = generateMockIncidents(20);
      await model.train(incidents);

      const status = model.getStatus();

      expect(status.trained).toBe(true);
      expect(status.lastTrainingTime).not.toBeNull();
      expect(status.historicalDataCount).toBe(20);
      expect(status.hotspotCount).toBeGreaterThan(0);
    });
  });

  describe('Distance Calculation', () => {
    test('should calculate distance correctly', () => {
      // Distance between Bangalore (12.9716, 77.5946) and Mumbai (19.0760, 72.8777)
      const distance = model.calculateDistance(12.9716, 77.5946, 19.0760, 72.8777);

      // Approximate distance is ~840 km
      expect(distance).toBeGreaterThan(800);
      expect(distance).toBeLessThan(900);
    });

    test('should return 0 for same location', () => {
      const distance = model.calculateDistance(12.9716, 77.5946, 12.9716, 77.5946);

      expect(distance).toBe(0);
    });
  });
});

/**
 * Generate mock incidents for testing
 */
function generateMockIncidents(count) {
  const incidents = [];
  const baseDate = new Date('2026-05-11T00:00:00');

  for (let i = 0; i < count; i++) {
    incidents.push({
      location: {
        lat: 12.9716 + (Math.random() - 0.5) * 0.1,
        lng: 77.5946 + (Math.random() - 0.5) * 0.1
      },
      timestamp: new Date(baseDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      riskScore: Math.floor(Math.random() * 100)
    });
  }

  return incidents;
}
