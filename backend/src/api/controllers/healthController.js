/**
 * Health Check Controller
 * 
 * Provides endpoints for monitoring application health and readiness.
 * Used by load balancers, monitoring systems, and deployment pipelines.
 */

const express = require('express');
const router = express.Router();
const { db, bucket } = require('../../config/dependencies');
const { isFeatureEnabled } = require('../../config/env');

/**
 * Basic health check
 * Returns 200 if the application is running
 * 
 * GET /health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Detailed health check with dependency status
 * Checks database, storage, and external services
 * 
 * GET /health/detailed
 */
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {}
  };

  // Check Firestore connection
  try {
    if (db) {
      await db.collection('_health_check').doc('test').set({ 
        timestamp: new Date() 
      }, { merge: true });
      health.services.firestore = { status: 'connected', healthy: true };
    } else {
      health.services.firestore = { status: 'not_configured', healthy: false };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.firestore = { 
      status: 'error', 
      healthy: false, 
      error: error.message 
    };
    health.status = 'unhealthy';
  }

  // Check Firebase Storage
  try {
    if (bucket) {
      const [exists] = await bucket.exists();
      health.services.storage = { status: exists ? 'connected' : 'not_found', healthy: exists };
      if (!exists) health.status = 'degraded';
    } else {
      health.services.storage = { status: 'not_configured', healthy: false };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.storage = { 
      status: 'error', 
      healthy: false, 
      error: error.message 
    };
    health.status = 'unhealthy';
  }

  // Check optional services
  health.services.blockchain = {
    status: isFeatureEnabled('blockchain') ? 'enabled' : 'disabled',
    healthy: true
  };

  health.services.sms = {
    status: isFeatureEnabled('sms') ? 'enabled' : 'disabled',
    healthy: true
  };

  health.services.maps = {
    status: isFeatureEnabled('maps') ? 'enabled' : 'disabled',
    healthy: true
  };

  // Set HTTP status based on health
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

/**
 * Readiness check
 * Returns 200 when the application is ready to accept traffic
 * Used by Kubernetes and other orchestration systems
 * 
 * GET /health/ready
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Check critical dependencies
    if (!db) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not configured'
      });
    }

    // Test database connection
    await db.collection('_health_check').doc('test').get();

    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error.message
    });
  }
});

/**
 * Liveness check
 * Returns 200 if the application process is alive
 * Used by Kubernetes to restart unhealthy pods
 * 
 * GET /health/live
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

/**
 * System metrics
 * Returns system resource usage
 * 
 * GET /health/metrics
 */
router.get('/health/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
    },
    cpu: {
      user: process.cpuUsage().user,
      system: process.cpuUsage().system
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
});

module.exports = router;
