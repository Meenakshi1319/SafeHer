/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring system health and readiness.
 * Used by load balancers, monitoring tools, and deployment systems.
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * GET /health/ready
 * Readiness check - returns 200 only if all dependencies are ready
 */
router.get('/health/ready', async (req, res) => {
  const checks = {
    server: 'ok',
    firebase: 'unknown',
    firestore: 'unknown',
    storage: 'unknown',
  };

  let allHealthy = true;

  // Check Firebase Admin initialization
  try {
    if (admin.apps.length > 0) {
      checks.firebase = 'ok';
      
      // Check Firestore connectivity
      try {
        const db = admin.firestore();
        await db.collection('_health_check').doc('ping').set({ 
          timestamp: new Date() 
        }, { merge: true });
        checks.firestore = 'ok';
      } catch (err) {
        checks.firestore = 'error';
        allHealthy = false;
      }

      // Check Storage bucket
      try {
        const bucket = admin.storage().bucket();
        const [exists] = await bucket.exists();
        checks.storage = exists ? 'ok' : 'not_configured';
        if (!exists) allHealthy = false;
      } catch (err) {
        checks.storage = 'error';
        allHealthy = false;
      }
    } else {
      checks.firebase = 'not_initialized';
      checks.firestore = 'not_initialized';
      checks.storage = 'not_initialized';
      allHealthy = false;
    }
  } catch (err) {
    checks.firebase = 'error';
    allHealthy = false;
  }

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * GET /health/live
 * Liveness check - returns 200 if server process is alive
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: process.memoryUsage(),
  });
});

module.exports = router;
