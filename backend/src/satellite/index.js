/**
 * Satellite Communication Module Entry Point
 * 
 * FUTURE_SCOPE: Satellite-based emergency communication fallback
 * 
 * @module satellite
 */

const {
  SatelliteService,
  SatelliteProvider,
  MessagePriority,
  satelliteService
} = require('./SatelliteService');

module.exports = {
  SatelliteService,
  SatelliteProvider,
  MessagePriority,
  satelliteService
};
