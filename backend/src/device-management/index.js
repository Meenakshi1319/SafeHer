/**
 * Device Management Module Entry Point
 * 
 * FUTURE_SCOPE: Centralized device management and OTA updates
 * 
 * @module device-management
 */

const {
  DeviceManagementService,
  DeviceCategory,
  DeviceStatus,
  deviceManagementService
} = require('./DeviceManagementService');

module.exports = {
  DeviceManagementService,
  DeviceCategory,
  DeviceStatus,
  deviceManagementService
};
