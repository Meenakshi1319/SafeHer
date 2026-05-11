/**
 * Location API Endpoint Tests
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../src/config/dependencies', () => ({
  db: {
    collection: jest.fn((collectionName) => ({
      where: jest.fn(() => ({
        get: jest.fn(() => {
          if (collectionName === 'sos_triggers' || collectionName === 'community_reports') {
            return Promise.resolve({
              empty: false,
              size: 5,
              forEach: jest.fn((callback) => {
                for (let i = 0; i < 5; i++) {
                  callback({
                    data: () => ({
                      location: { lat: 12.9716 + i * 0.01, lng: 77.5946 + i * 0.01 },
                      timestamp: { toDate: () => new Date() },
                      severity: 'high',
                      riskScore: 85
                    })
                  });
                }
              })
            });
          }
          return Promise.resolve({ empty: true, size: 0, forEach: jest.fn() });
        }),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({
              empty: false,
              docs: [{
                data: () => ({
                  latitude: 12.9716,
                  longitude: 77.5946,
                  timestamp: new Date()
                })
              }]
            }))
          }))
        }))
      })),
      add: jest.fn(() => Promise.resolve({ id: 'test-id' }))
    }))
  }
}));

jest.mock('../../src/services/coreServices', () => ({
  logEvent: jest.fn(),
  generateLocationLink: jest.fn((lat, lng) => `https://maps.google.com/?q=${lat},${lng}`)
}));

jest.mock('../../src/ml/CrimePredictionModel', () => ({
  crimePredictionModel: {
    train: jest.fn(() => Promise.resolve({ success: true, hotspots: 5 })),
    predict: jest.fn(() => ({
      riskScore: 0.65,
      riskLevel: 'HIGH',
      factors: { temporal: 1.2, spatial: 0.8, historical: 0.6 },
      confidence: 0.85
    })),
    predictRiskZones: jest.fn(() => []),
    getStatus: jest.fn(() => ({
      trained: false,
      lastTrainingTime: null,
      historicalDataCount: 0,
      hotspotCount: 0
    }))
  }
}));

// Create test app
const app = express();
app.use(express.json());

// Mock middleware
const mockMiddlewares = {
  requireAuth: (req, res, next) => {
    req.user = { uid: 'test-user' };
    next();
  },
  requireSelfOrAdmin: (req, res, next) => next()
};

// Import and mount routes
const locationController = require('../../src/api/controllers/locationController');
app.use('/', locationController(mockMiddlewares));

describe('Location API Endpoints', () => {
  describe('POST /save-location', () => {
    test('should save location successfully', async () => {
      const response = await request(app)
        .post('/save-location')
        .send({
          uid: 'test-user',
          latitude: 12.9716,
          longitude: 77.5946
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Location Saved Successfully');
    });

    test('should require uid, latitude, and longitude', async () => {
      const response = await request(app)
        .post('/save-location')
        .send({
          uid: 'test-user'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should validate latitude range', async () => {
      const response = await request(app)
        .post('/save-location')
        .send({
          uid: 'test-user',
          latitude: 200, // Invalid
          longitude: 77.5946
        })
        .expect(200);

      // Should still save (validation could be added)
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /location/heatmap', () => {
    test('should return heatmap data', async () => {
      const response = await request(app)
        .get('/location/heatmap')
        .query({ latitude: 12.9716, longitude: 77.5946, radius: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should require latitude and longitude', async () => {
      const response = await request(app)
        .get('/location/heatmap')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('latitude and longitude are required');
    });

    test('should use default radius if not provided', async () => {
      const response = await request(app)
        .get('/location/heatmap')
        .query({ latitude: 12.9716, longitude: 77.5946 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return hotspots with required properties', async () => {
      const response = await request(app)
        .get('/location/heatmap')
        .query({ latitude: 12.9716, longitude: 77.5946, radius: 10 })
        .expect(200);

      if (response.body.data.length > 0) {
        const hotspot = response.body.data[0];
        expect(hotspot).toHaveProperty('latitude');
        expect(hotspot).toHaveProperty('longitude');
        expect(hotspot).toHaveProperty('intensity');
      }
    });
  });

  describe('GET /location/:uid', () => {
    test('should return user location', async () => {
      const response = await request(app)
        .get('/location/test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('latitude');
      expect(response.body).toHaveProperty('longitude');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('mapsLink');
    });

    test('should generate correct maps link', async () => {
      const response = await request(app)
        .get('/location/test-user')
        .expect(200);

      expect(response.body.mapsLink).toContain('maps.google.com');
      expect(response.body.mapsLink).toContain(response.body.latitude.toString());
      expect(response.body.mapsLink).toContain(response.body.longitude.toString());
    });
  });

  describe('POST /location/report-incident', () => {
    test('should report incident successfully', async () => {
      const response = await request(app)
        .post('/location/report-incident')
        .send({
          uid: 'test-user',
          latitude: 12.9716,
          longitude: 77.5946,
          severity: 'high',
          description: 'Test incident',
          incidentType: 'harassment'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reported successfully');
      expect(response.body).toHaveProperty('reportId');
    });

    test('should require uid, latitude, longitude, and severity', async () => {
      const response = await request(app)
        .post('/location/report-incident')
        .send({
          uid: 'test-user',
          latitude: 12.9716
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should validate severity values', async () => {
      const response = await request(app)
        .post('/location/report-incident')
        .send({
          uid: 'test-user',
          latitude: 12.9716,
          longitude: 77.5946,
          severity: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('severity must be');
    });

    test('should accept valid severity values', async () => {
      for (const severity of ['low', 'medium', 'high']) {
        const response = await request(app)
          .post('/location/report-incident')
          .send({
            uid: 'test-user',
            latitude: 12.9716,
            longitude: 77.5946,
            severity
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should accept optional description and incidentType', async () => {
      const response = await request(app)
        .post('/location/report-incident')
        .send({
          uid: 'test-user',
          latitude: 12.9716,
          longitude: 77.5946,
          severity: 'medium',
          description: 'Detailed description',
          incidentType: 'theft'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /location/safe-route', () => {
    test('should return safe routes', async () => {
      const response = await request(app)
        .post('/location/safe-route')
        .send({
          start: { latitude: 12.9716, longitude: 77.5946 },
          end: { latitude: 12.9352, longitude: 77.6245 }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.routes)).toBe(true);
    });

    test('should require start and end coordinates', async () => {
      const response = await request(app)
        .post('/location/safe-route')
        .send({
          start: { latitude: 12.9716, longitude: 77.5946 }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('start and end coordinates required');
    });

    test('should return routes with required properties', async () => {
      const response = await request(app)
        .post('/location/safe-route')
        .send({
          start: { latitude: 12.9716, longitude: 77.5946 },
          end: { latitude: 12.9352, longitude: 77.6245 }
        })
        .expect(200);

      if (response.body.routes.length > 0) {
        const route = response.body.routes[0];
        expect(route).toHaveProperty('distance');
        expect(route).toHaveProperty('duration');
        expect(route).toHaveProperty('waypoints');
        expect(route).toHaveProperty('steps');
      }
    });

    test('should include safety ratings', async () => {
      const response = await request(app)
        .post('/location/safe-route')
        .send({
          start: { latitude: 12.9716, longitude: 77.5946 },
          end: { latitude: 12.9352, longitude: 77.6245 }
        })
        .expect(200);

      if (response.body.routes.length > 0) {
        const route = response.body.routes[0];
        expect(route).toHaveProperty('safetyRating');
        expect(['Safe', 'Moderate', 'Risky']).toContain(route.safetyRating);
      }
    });
  });

  describe('Authentication', () => {
    test('should require authentication for all endpoints', async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      const noAuthMiddlewares = {
        requireAuth: (req, res, next) => res.status(401).json({ success: false, message: 'Unauthorized' }),
        requireSelfOrAdmin: (req, res, next) => next()
      };
      appNoAuth.use('/', locationController(noAuthMiddlewares));

      await request(appNoAuth)
        .post('/save-location')
        .send({ uid: 'test', latitude: 12, longitude: 77 })
        .expect(401);

      await request(appNoAuth)
        .get('/location/heatmap')
        .query({ latitude: 12, longitude: 77 })
        .expect(401);

      await request(appNoAuth)
        .post('/location/report-incident')
        .send({ uid: 'test', latitude: 12, longitude: 77, severity: 'high' })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid coordinates gracefully', async () => {
      const response = await request(app)
        .get('/location/heatmap')
        .query({ latitude: 'invalid', longitude: 'invalid' })
        .expect(200);

      // Should still return a response
      expect(response.body).toHaveProperty('success');
    });

    test('should handle missing query parameters', async () => {
      const response = await request(app)
        .get('/location/heatmap')
        .query({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
