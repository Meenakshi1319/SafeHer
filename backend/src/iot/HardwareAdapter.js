/**
 * Hardware Abstraction Layer (HAL)
 * 
 * Provides a unified interface for interacting with various IoT devices,
 * wearables, and safety hardware. This abstraction enables easy integration
 * of new devices without modifying core application logic.
 * 
 * FUTURE_SCOPE: This module will support:
 * - Smart home safety devices (door sensors, panic buttons)
 * - Wearable devices (smartwatches, fitness trackers)
 * - Vehicle telematics systems
 * - Environmental sensors
 * - Medical monitoring devices
 * 
 * @module HardwareAdapter
 * @version 1.0.0
 * @status SCAFFOLD - Ready for implementation
 */

const { logEvent } = require('../services/coreServices');

/**
 * Device Status Enum
 */
const DeviceStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  PAIRING: 'pairing',
  ERROR: 'error',
  LOW_BATTERY: 'low_battery',
  UPDATING: 'updating'
};

/**
 * Device Type Enum
 */
const DeviceType = {
  PANIC_BUTTON: 'panic_button',
  SMARTWATCH: 'smartwatch',
  FITNESS_TRACKER: 'fitness_tracker',
  DOOR_SENSOR: 'door_sensor',
  MOTION_SENSOR: 'motion_sensor',
  GPS_TRACKER: 'gps_tracker',
  ENVIRONMENTAL_SENSOR: 'environmental_sensor',
  MEDICAL_DEVICE: 'medical_device',
  VEHICLE_SYSTEM: 'vehicle_system'
};

/**
 * Abstract Hardware Adapter Class
 * 
 * All device adapters must extend this class and implement its methods.
 * This ensures consistent interface across all hardware integrations.
 */
class HardwareAdapter {
  constructor(deviceId, deviceType, config = {}) {
    if (new.target === HardwareAdapter) {
      throw new TypeError('Cannot instantiate abstract class HardwareAdapter directly');
    }

    this.deviceId = deviceId;
    this.deviceType = deviceType;
    this.config = config;
    this.status = DeviceStatus.DISCONNECTED;
    this.lastSeen = null;
    this.batteryLevel = null;
    this.firmwareVersion = null;
  }

  /**
   * Connect to the device
   * 
   * FUTURE_SCOPE: Implement device-specific connection logic
   * - Bluetooth LE pairing
   * - WiFi provisioning
   * - MQTT broker connection
   * - LoRaWAN join procedure
   * 
   * @returns {Promise<boolean>} Connection success status
   */
  async connect() {
    throw new Error('Method connect() must be implemented by subclass');
  }

  /**
   * Disconnect from the device
   * 
   * FUTURE_SCOPE: Graceful disconnection with cleanup
   * - Close BLE connection
   * - Unsubscribe from MQTT topics
   * - Release resources
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Method disconnect() must be implemented by subclass');
  }

  /**
   * Read sensor data from the device
   * 
   * FUTURE_SCOPE: Device-specific data reading
   * - BLE characteristic read
   * - MQTT message parsing
   * - HTTP API polling
   * - WebSocket data stream
   * 
   * @returns {Promise<Object>} Sensor data object
   */
  async readSensorData() {
    throw new Error('Method readSensorData() must be implemented by subclass');
  }

  /**
   * Trigger SOS alert from the device
   * 
   * FUTURE_SCOPE: Hardware-triggered emergency alerts
   * - Panic button press
   * - Fall detection
   * - Abnormal heart rate
   * - Geofence breach
   * 
   * @param {Object} alertData - Alert metadata
   * @returns {Promise<void>}
   */
  async triggerSOS(alertData = {}) {
    throw new Error('Method triggerSOS() must be implemented by subclass');
  }

  /**
   * Get current device status
   * 
   * @returns {Object} Device status information
   */
  getStatus() {
    return {
      deviceId: this.deviceId,
      deviceType: this.deviceType,
      status: this.status,
      lastSeen: this.lastSeen,
      batteryLevel: this.batteryLevel,
      firmwareVersion: this.firmwareVersion,
      connected: this.status === DeviceStatus.CONNECTED
    };
  }

  /**
   * Update device firmware
   * 
   * FUTURE_SCOPE: Over-the-air (OTA) firmware updates
   * - Download firmware from CDN
   * - Verify signature
   * - Flash to device
   * - Verify update success
   * 
   * @param {string} version - Target firmware version
   * @returns {Promise<boolean>} Update success status
   */
  async updateFirmware(version) {
    throw new Error('Method updateFirmware() must be implemented by subclass');
  }

  /**
   * Configure device settings
   * 
   * FUTURE_SCOPE: Remote device configuration
   * - Sensitivity settings
   * - Alert thresholds
   * - Reporting intervals
   * - Power management
   * 
   * @param {Object} settings - Configuration object
   * @returns {Promise<boolean>} Configuration success status
   */
  async configure(settings) {
    throw new Error('Method configure() must be implemented by subclass');
  }

  /**
   * Subscribe to device events
   * 
   * FUTURE_SCOPE: Real-time event streaming
   * - Button press events
   * - Sensor threshold alerts
   * - Battery warnings
   * - Connection status changes
   * 
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} callback - Event handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    throw new Error('Method subscribe() must be implemented by subclass');
  }

  /**
   * Send command to device
   * 
   * FUTURE_SCOPE: Remote device control
   * - Activate alarm
   * - Flash LED
   * - Vibrate
   * - Lock/unlock
   * 
   * @param {string} command - Command name
   * @param {Object} params - Command parameters
   * @returns {Promise<Object>} Command response
   */
  async sendCommand(command, params = {}) {
    throw new Error('Method sendCommand() must be implemented by subclass');
  }

  /**
   * Get device capabilities
   * 
   * @returns {Object} Device capabilities and features
   */
  getCapabilities() {
    return {
      canTriggerSOS: false,
      canReadSensors: false,
      canReceiveCommands: false,
      canUpdateFirmware: false,
      supportedSensors: [],
      supportedCommands: []
    };
  }

  /**
   * Validate device health
   * 
   * FUTURE_SCOPE: Device health monitoring
   * - Battery level check
   * - Signal strength
   * - Sensor calibration status
   * - Error log analysis
   * 
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    return {
      healthy: this.status === DeviceStatus.CONNECTED,
      issues: [],
      recommendations: []
    };
  }
}

/**
 * Example: Panic Button Adapter
 * 
 * FUTURE_SCOPE: Implement for physical panic button devices
 * Technology: Bluetooth LE, MQTT, or proprietary protocol
 */
class PanicButtonAdapter extends HardwareAdapter {
  constructor(deviceId, config) {
    super(deviceId, DeviceType.PANIC_BUTTON, config);
  }

  async connect() {
    // TODO: Implement BLE connection logic
    logEvent('INFO', `[IoT] Connecting to panic button: ${this.deviceId}`);
    this.status = DeviceStatus.CONNECTED;
    this.lastSeen = new Date();
    return true;
  }

  async disconnect() {
    // TODO: Implement disconnection logic
    logEvent('INFO', `[IoT] Disconnecting panic button: ${this.deviceId}`);
    this.status = DeviceStatus.DISCONNECTED;
  }

  async readSensorData() {
    // TODO: Read button state, battery level
    return {
      buttonPressed: false,
      batteryLevel: 85,
      signalStrength: -65
    };
  }

  async triggerSOS(alertData) {
    // TODO: Handle panic button press
    logEvent('ALERT', `[IoT] Panic button pressed: ${this.deviceId}`, alertData);
    // Trigger SafeHer SOS system
  }

  getCapabilities() {
    return {
      canTriggerSOS: true,
      canReadSensors: true,
      canReceiveCommands: true,
      canUpdateFirmware: true,
      supportedSensors: ['button', 'battery'],
      supportedCommands: ['test_alert', 'led_flash', 'vibrate']
    };
  }
}

/**
 * Example: Smartwatch Adapter
 * 
 * FUTURE_SCOPE: Implement for Apple Watch, Wear OS, etc.
 * Technology: HealthKit, Google Fit, Bluetooth LE
 */
class SmartwatchAdapter extends HardwareAdapter {
  constructor(deviceId, config) {
    super(deviceId, DeviceType.SMARTWATCH, config);
  }

  async connect() {
    // TODO: Implement smartwatch connection
    // - iOS: HealthKit authorization
    // - Android: Google Fit API
    // - BLE: Direct connection
    logEvent('INFO', `[IoT] Connecting to smartwatch: ${this.deviceId}`);
    this.status = DeviceStatus.CONNECTED;
    return true;
  }

  async disconnect() {
    logEvent('INFO', `[IoT] Disconnecting smartwatch: ${this.deviceId}`);
    this.status = DeviceStatus.DISCONNECTED;
  }

  async readSensorData() {
    // TODO: Read health data
    // - Heart rate
    // - Steps
    // - Activity level
    // - Sleep data
    return {
      heartRate: 72,
      steps: 5420,
      activityLevel: 'moderate',
      batteryLevel: 65
    };
  }

  async triggerSOS(alertData) {
    // TODO: Handle smartwatch SOS trigger
    // - Fall detection
    // - Abnormal heart rate
    // - Manual SOS button
    logEvent('ALERT', `[IoT] Smartwatch SOS triggered: ${this.deviceId}`, alertData);
  }

  getCapabilities() {
    return {
      canTriggerSOS: true,
      canReadSensors: true,
      canReceiveCommands: true,
      canUpdateFirmware: false, // Managed by OS
      supportedSensors: ['heart_rate', 'steps', 'activity', 'sleep', 'fall_detection'],
      supportedCommands: ['vibrate', 'notification', 'haptic_feedback']
    };
  }
}

/**
 * Device Registry
 * 
 * FUTURE_SCOPE: Central registry for all connected devices
 * - Device discovery
 * - Connection management
 * - Event routing
 * - Health monitoring
 */
class DeviceRegistry {
  constructor() {
    this.devices = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Register a new device
   * 
   * @param {HardwareAdapter} device - Device adapter instance
   */
  register(device) {
    if (!(device instanceof HardwareAdapter)) {
      throw new TypeError('Device must be an instance of HardwareAdapter');
    }

    this.devices.set(device.deviceId, device);
    logEvent('INFO', `[IoT] Device registered: ${device.deviceId} (${device.deviceType})`);
  }

  /**
   * Unregister a device
   * 
   * @param {string} deviceId - Device identifier
   */
  async unregister(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      await device.disconnect();
      this.devices.delete(deviceId);
      logEvent('INFO', `[IoT] Device unregistered: ${deviceId}`);
    }
  }

  /**
   * Get device by ID
   * 
   * @param {string} deviceId - Device identifier
   * @returns {HardwareAdapter|null}
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Get all devices
   * 
   * @returns {Array<HardwareAdapter>}
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get devices by type
   * 
   * @param {string} deviceType - Device type
   * @returns {Array<HardwareAdapter>}
   */
  getDevicesByType(deviceType) {
    return this.getAllDevices().filter(device => device.deviceType === deviceType);
  }

  /**
   * Get connected devices
   * 
   * @returns {Array<HardwareAdapter>}
   */
  getConnectedDevices() {
    return this.getAllDevices().filter(device => device.status === DeviceStatus.CONNECTED);
  }
}

// Singleton instance
const deviceRegistry = new DeviceRegistry();

module.exports = {
  HardwareAdapter,
  PanicButtonAdapter,
  SmartwatchAdapter,
  DeviceRegistry,
  DeviceStatus,
  DeviceType,
  deviceRegistry
};

/**
 * FUTURE_SCOPE: Additional Adapters to Implement
 * 
 * 1. DoorSensorAdapter - Smart door/window sensors
 * 2. MotionSensorAdapter - PIR motion detectors
 * 3. GPSTrackerAdapter - Standalone GPS devices
 * 4. EnvironmentalSensorAdapter - Air quality, temperature, etc.
 * 5. MedicalDeviceAdapter - Blood pressure, glucose monitors
 * 6. VehicleSystemAdapter - Car telematics integration
 * 7. SmartLockAdapter - Electronic door locks
 * 8. CameraAdapter - Security cameras
 * 9. BeaconAdapter - iBeacon, Eddystone
 * 10. SatelliteDeviceAdapter - Satellite communicators
 */
