/**
 * Health Monitoring Module Entry Point
 * 
 * FUTURE_SCOPE: AI-powered health monitoring and anomaly detection
 * 
 * @module health-monitoring
 */

const {
  HealthMonitoringService,
  HealthAlertType,
  AlertSeverity,
  healthMonitoringService
} = require('./HealthMonitoringService');

module.exports = {
  HealthMonitoringService,
  HealthAlertType,
  AlertSeverity,
  healthMonitoringService
};
