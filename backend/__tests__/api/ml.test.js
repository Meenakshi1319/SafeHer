/**
 * ML API Endpoint Tests
 */

const request = require('supertest');
const express = require('express');
const { crimePredictionModel } = require('../../src/ml/CrimePredictionModel');

// Mock dependencies
jest.mock('../../src/config/dependencies', () => ({
  db: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ empty: false, size: 0, forEach: jest.fn() }))
      })),
      add: jest.fn(() => Promise.resolve({ id: 'test-id' }))
    }))
  }
}));

jest.mock('../../src/services/coreServices', () => ({
  logEvent: jest.fn(),
  generateLocationLink: jest.fn((lat, lng) => `https://maps.google.com/?q=${lat},${lng}`)
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

describe('ML API Endpoints', () => {
  beforeEach(() => {
    // Reset model before each test
    crimePredictionModel.historicalData = [];
    crimePredictionModel.hotspotClusters = [];
    crimePredictionModel.modelTrained = false;
  });

  describe('POST /location/ml/train', () => {
    test('should train model successfully', async () => {
      const response = await request(app)
        .post('/location/ml/train')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
    });

    test('should require authentication', async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      const noAuthMiddlewares = {
        requireAuth: (req, res, next) => res.status(401).json({ success: false, message: 'Unauthorized' }),
        requireSelfOrAdmin: (req, res, next) => next()
      };
      appNoAuth.use('/', locationController(noAuthMiddlewares));

      await request(appNoAuth)
        .post('/location/ml/train')
        .expect(401);
    });
  });

  describe('GET /location/ml/predict', () => {
    test('should predict risk for a location', async () => {
      const response = await request(app)
        .get('/location/ml/predict')
        .query({ latitude: 12.9716, longitude: 77.5946 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.prediction).toHaveProperty('riskScore');
      expect(response.body.prediction).toHaveProperty('riskLevel');
      expect(response.body.prediction).toHaveProperty('factors');
      expect(response.body.prediction).toHaveProperty('confidence');
    });

    test('should require latitude and longitude', async () => {
      const response = await request(app)
        .get('/location/ml/predict')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('latitude and longitude are required');
    });

    test('should accept optional timestamp', async () => {
      const timestamp = '2026-05-11T02:00:00Z';
      const response = await request(app)
        .get('/location/ml/predict')
        .query({ latitude: 12.9716, longitude: 77.5946, timestamp })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.prediction.timestamp).toBe(timestamp);
    });

    test('should return valid risk score range', async () => {
      const response = await request(app)
        .get('/location/ml/predict')
        .query({ latitude: 12.9716, longitude: 77.5946 })
        .expect(200);

      expect(response.body.prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.prediction.riskScore).toBeLessThanOrEqual(1);
    });

    test('should return valid risk level', async () => {
      const response = await request(app)
        .get('/location/ml/predict')
        .query({ latitude: 12.9716, longitude: 77.5946 })
        .expect(200);

      expect(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).toContain(response.body.prediction.riskLevel);
    });
  });

  describe('GET /location/ml/predict-zones', () => {
    test('should predict risk zones for an area', async () => {
      const response = await request(app)
        .get('/location/ml/predict-zones')
        .query({ latitude: 12.9716, longitude: 77.5946, radius: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.zones)).toBe(true);
      expect(response.body).toHaveProperty('center');
      expect(response.body).toHaveProperty('radius');
      expect(response.body).toHaveProperty('predictedFor');
    });

    test('should require latitude and longitude', async () => {
      const response = await request(app)
        .get('/location/ml/predict-zones')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('latitude and longitude are required');
    });

    test('should use default radius if not provided', async () => {
      const response = await request(app)
        .get('/location/ml/predict-zones')
        .query({ latitude: 12.9716, longitude: 77.5946 })
        .expect(200);

      expect(response.body.radius).toBe(5);
    });

    test('should accept custom radius', async () => {
      const response = await request(app)
        .get('/location/ml/predict-zones')
        .query({ latitude: 12.9716, longitude: 77.5946, radius: 10 })
        .expect(200);

      expect(response.body.radius).toBe(10);
    });

    test('should return zones with required properties', async () => {
      const response = await request(app)
        .get('/location/ml/predict-zones')
        .query({ latitude: 12.9716, longitude: 77.5946, radius: 5 })
        .expect(200);

      if (response.body.zones.length > 0) {
        const zone = response.body.zones[0];
        expect(zone).toHaveProperty('latitude');
        expect(zone).toHaveProperty('longitude');
        expect(zone).toHaveProperty('riskScore');
        expect(zone).toHaveProperty('riskLevel');
      }
    });
  });

  describe('GET /location/ml/status', () => {
    test('should return model status', async () => {
      const response = await request(app)
        .get('/location/ml/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.model).toHaveProperty('trained');
      expect(response.body.model).toHaveProperty('lastTrainingTime');
      expect(response.body.model).toHaveProperty('historicalDataCount');
      expect(response.body.model).toHaveProperty('hotspotCount');
    });

    test('should show untrained status initially', async () => {
      const response = await request(app)
        .get('/location/ml/status')
        .expect(200);

      expect(response.body.model.trained).toBe(false);
      expect(response.body.model.historicalDataCount).toBe(0);
      expect(response.body.model.hotspotCount).toBe(0);
    });
  });

  describe('GET /location/ml/predictive-heatmap', () => {
    test('should return combined heatmap', async () => {
      const response = await request(app)
        .get('/location/ml/predictive-heatmap')
        .query({ latitude: 12.9716, longitude: 77.5946, radius: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.heatmap)).toBe(true);
      expect(response.body).toHaveProperty('historicalCount');
      expect(response.body).toHaveProperty('predictedCount');
      expect(response.body).toHaveProperty('predictedFor');
    });

    test('should require latitude and longitude', async () => {
      const response = await request(app)
        .get('/location/ml/predictive-heatmap')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('latitude and longitude are required');
    });

    test('should include source labels', async () => {
      const response = await request(app)
        .get('/location/ml/predictive-heatmap')
        .query({ latitude: 12.9716, longitude: 77.5946, radius: 10 })
        .expect(200);

      if (response.body.heatmap.length > 0) {
        const point = response.body.heatmap[0];
        expect(point).toHaveProperty('source');
        expect(['historical', 'ml_prediction']).toContain(point.source);
      }
    });

    test('should use default radius if not provided', async () => {
      const response = await request(app)
        .get('/location/ml/predictive-heatmap')
        .query({ latitude: 12.9716, longitude: 77.5946 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should train model and then make predictions', async () => {
      // Train model
      await request(app)
        .post('/location/ml/train')
        .expect(200);

      // Make prediction
      const predictionResponse = await request(app)
        .get('/location/ml/predict')
        .query({ latitude: 12.9716, longitude: 77.5946 })
        .expect(200);

      expect(predictionResponse.body.success).toBe(true);
      expect(predictionResponse.body.prediction.confidence).toBeGreaterThan(0);
    });

    test('should show trained status after training', async () => {
      // Train model
      await request(app)
        .post('/location/ml/train')
        .expect(200);

      // Check status
      const statusResponse = await request(app)
        .get('/location/ml/status')
        .expect(200);

      expect(statusResponse.body.model.trained).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid coordinates gracefully', async () => {
      const response = await request(app)
        .get('/location/ml/predict')
        .query({ latitude: 'invalid', longitude: 'invalid' })
        .expect(200);

      // Should still return a response (NaN will be handled)
      expect(response.body).toHaveProperty('success');
    });

    test('should handle invalid timestamp gracefully', async () => {
      const response = await request(app)
        .get('/location/ml/predict')
        .query({ latitude: 12.9716, longitude: 77.5946, timestamp: 'invalid' })
        .expect(200);

      // Should use current time as fallback
      expect(response.body.success).toBe(true);
    });
  });
});
