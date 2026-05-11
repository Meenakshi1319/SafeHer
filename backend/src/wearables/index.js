/**
 * Wearables Module Entry Point
 * 
 * FUTURE_SCOPE: Smartwatch and fitness tracker integration
 * 
 * @module wearables
 */

const {
  WearableService,
  WearablePlatform,
  HealthDataType,
  wearableService
} = require('./WearableService');

module.exports = {
  WearableService,
  WearablePlatform,
  HealthDataType,
  wearableService
};
