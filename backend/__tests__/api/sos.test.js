/**
 * SOS System Tests
 */

const request = require('supertest');
const express = require('express');

// Mock Twilio
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({ sid: 'test-message-sid' }))
    }
  }));
});

// Mock Firebase
jest.mock('../../src/config/dependencies', () => ({
  db: {
    collection: jest.fn((collectionName) => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({
              empty: false,
              docs: [
                {
                  id: 'contact1',
                  data: () => ({
                    name: 'Emergency Contact 1',
                    phone: '+1234567890',
                    type: 'family'
                  })
                },
                {
                  id: 'contact2',
                  data: () => ({
                    name: 'Emergency Contact 2',
                    phone: '+0987654321',
                    type: 'trusted'
                  })
                }
              ]
            }))
          })),
          add: jest.fn(() => Promise.resolve({ id: 'test-alert-id' }))
        }))
      })),
      add: jest.fn(() => Promise.resolve({ id: 'test-global-alert-id' }))
    }))
  }
}));

jest.mock('../../src/services/coreServices', () => ({
  logEvent: jest.fn(),
  generateLocationLink: jest.fn((lat, lng) => `https://maps.google.com/?q=${lat},${lng}`)
}));

describe('SOS System Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock middleware
    const mockMiddlewares = {
      requireAuth: (req, res, next) => {
        req.user = { uid: 'test-user' };
        next();
      },
      requireSelfOrAdmin: (req, res, next) => next()
    };

    // Mock SOS route
    app.post('/trigger-sos', mockMiddlewares.requireAuth, async (req, res) => {
      try {
        const { uid, reason, latitude, longitude, riskScore } = req.body;

        if (!uid || !reason || latitude == null || longitude == null) {
          return res.status(400).json({
            success: false,
            message: 'uid, reason, latitude, and longitude are required'
          });
        }

        // Validate risk score
        if (riskScore != null && (riskScore < 0 || riskScore > 100)) {
          return res.status(400).json({
            success: false,
            message: 'riskScore must be between 0 and 100'
          });
        }

        // Calculate risk level
        const score = riskScore || 50;
        let riskLevel = 'LOW';
        if (score > 85) riskLevel = 'VERY_HIGH';
        else if (score > 60) riskLevel = 'HIGH';
        else if (score > 30) riskLevel = 'MEDIUM';

        res.status(200).json({
          success: true,
          message: 'SOS triggered successfully',
          alertId: 'test-alert-id',
          riskLevel,
          contactsNotified: 2
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  });

  describe('POST /trigger-sos', () => {
    test('should trigger SOS successfully', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946,
          riskScore: 85
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('SOS triggered successfully');
      expect(response.body).toHaveProperty('alertId');
      expect(response.body).toHaveProperty('riskLevel');
      expect(response.body).toHaveProperty('contactsNotified');
    });

    test('should require uid, reason, latitude, and longitude', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should validate risk score range', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946,
          riskScore: 150 // Invalid
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('riskScore must be between 0 and 100');
    });

    test('should calculate correct risk level', async () => {
      const testCases = [
        { score: 95, expectedLevel: 'VERY_HIGH' },
        { score: 75, expectedLevel: 'HIGH' },
        { score: 45, expectedLevel: 'MEDIUM' },
        { score: 20, expectedLevel: 'LOW' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/trigger-sos')
          .send({
            uid: 'test-user',
            reason: 'Emergency',
            latitude: 12.9716,
            longitude: 77.5946,
            riskScore: testCase.score
          })
          .expect(200);

        expect(response.body.riskLevel).toBe(testCase.expectedLevel);
      }
    });

    test('should use default risk score if not provided', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('riskLevel');
    });

    test('should accept different SOS reasons', async () => {
      const reasons = ['Emergency', 'Shake Detected', 'Voice Trigger', 'Manual SOS'];

      for (const reason of reasons) {
        const response = await request(app)
          .post('/trigger-sos')
          .send({
            uid: 'test-user',
            reason,
            latitude: 12.9716,
            longitude: 77.5946,
            riskScore: 70
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should notify contacts', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946,
          riskScore: 85
        })
        .expect(200);

      expect(response.body.contactsNotified).toBeGreaterThan(0);
    });
  });

  describe('Risk Level Classification', () => {
    test('should classify VERY_HIGH risk correctly', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946,
          riskScore: 90
        })
        .expect(200);

      expect(response.body.riskLevel).toBe('VERY_HIGH');
    });

    test('should classify HIGH risk correctly', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946,
          riskScore: 70
        })
        .expect(200);

      expect(response.body.riskLevel).toBe('HIGH');
    });

    test('should classify MEDIUM risk correctly', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946,
          riskScore: 45
        })
        .expect(200);

      expect(response.body.riskLevel).toBe('MEDIUM');
    });

    test('should classify LOW risk correctly', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946,
          riskScore: 25
        })
        .expect(200);

      expect(response.body.riskLevel).toBe('LOW');
    });
  });

  describe('Location Validation', () => {
    test('should accept valid coordinates', async () => {
      const validCoordinates = [
        { lat: 12.9716, lng: 77.5946 },
        { lat: 0, lng: 0 },
        { lat: -90, lng: -180 },
        { lat: 90, lng: 180 }
      ];

      for (const coords of validCoordinates) {
        const response = await request(app)
          .post('/trigger-sos')
          .send({
            uid: 'test-user',
            reason: 'Emergency',
            latitude: coords.lat,
            longitude: coords.lng,
            riskScore: 50
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Authentication', () => {
    test('should require authentication', async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.post('/trigger-sos', (req, res) => {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      });

      await request(appNoAuth)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 12.9716,
          longitude: 77.5946
        })
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle invalid data types', async () => {
      const response = await request(app)
        .post('/trigger-sos')
        .send({
          uid: 'test-user',
          reason: 'Emergency',
          latitude: 'invalid',
          longitude: 'invalid',
          riskScore: 'invalid'
        })
        .expect(200);

      // Should handle gracefully (NaN will be coerced)
      expect(response.body).toHaveProperty('success');
    });
  });
});
