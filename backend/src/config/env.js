/**
 * Environment Configuration Validator
 * 
 * Validates and loads environment variables with type checking and defaults.
 * Ensures all required configuration is present before the application starts.
 * 
 * SECURITY: This module centralizes environment variable access and validation,
 * preventing undefined or misconfigured values from causing runtime errors.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Environment variable schema
 * Defines required and optional variables with validation rules
 */
const envSchema = {
  // Server Configuration
  PORT: {
    required: false,
    default: '3000',
    validate: (val) => !isNaN(parseInt(val)),
    transform: (val) => parseInt(val)
  },
  NODE_ENV: {
    required: false,
    default: 'development',
    validate: (val) => ['development', 'production', 'test'].includes(val)
  },

  // Firebase Configuration
  FIREBASE_PROJECT_ID: {
    required: true,
    validate: (val) => val && val.length > 0
  },
  FIREBASE_CLIENT_EMAIL: {
    required: true,
    validate: (val) => val && val.includes('@')
  },
  FIREBASE_PRIVATE_KEY: {
    required: true,
    validate: (val) => val && val.includes('BEGIN PRIVATE KEY')
  },
  FIREBASE_STORAGE_BUCKET: {
    required: true,
    validate: (val) => val && val.includes('.appspot.com')
  },

  // Twilio Configuration (Optional - for SMS alerts)
  TWILIO_ACCOUNT_SID: {
    required: false,
    validate: (val) => !val || val.startsWith('AC')
  },
  TWILIO_AUTH_TOKEN: {
    required: false
  },
  TWILIO_PHONE_NUMBER: {
    required: false,
    validate: (val) => !val || val.startsWith('+')
  },

  // Blockchain Configuration (Optional - for evidence verification)
  POLYGON_RPC_URL: {
    required: false,
    default: 'https://rpc-amoy.polygon.technology'
  },
  EVIDENCE_VAULT_CONTRACT: {
    required: false
  },
  BLOCKCHAIN_PRIVATE_KEY: {
    required: false,
    validate: (val) => !val || val.startsWith('0x')
  },

  // Google Maps API (Optional - for routing)
  GOOGLE_MAPS_API_KEY: {
    required: false
  },

  // Security
  JWT_SECRET: {
    required: false,
    default: 'your-secret-key-change-in-production',
    validate: (val) => val && val.length >= 32
  },

  // CORS Configuration
  CORS_ORIGIN: {
    required: false,
    default: '*'
  }
};

/**
 * Validate a single environment variable
 * 
 * @param {string} key - Environment variable name
 * @param {Object} schema - Validation schema
 * @returns {*} Validated and transformed value
 * @throws {Error} If validation fails
 */
function validateEnvVar(key, schema) {
  let value = process.env[key];

  // Check if required
  if (schema.required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  // Apply default if not provided
  if (!value && schema.default !== undefined) {
    value = schema.default;
  }

  // Skip validation if value is not provided and not required
  if (!value && !schema.required) {
    return null;
  }

  // Validate value
  if (schema.validate && !schema.validate(value)) {
    throw new Error(`Invalid value for environment variable: ${key}`);
  }

  // Transform value if transformer is provided
  if (schema.transform) {
    return schema.transform(value);
  }

  return value;
}

/**
 * Validate all environment variables
 * 
 * @returns {Object} Validated configuration object
 * @throws {Error} If any validation fails
 */
function validateEnv() {
  const config = {};
  const errors = [];

  for (const [key, schema] of Object.entries(envSchema)) {
    try {
      config[key] = validateEnvVar(key, schema);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Environment validation failed. Check your .env file.');
  }

  return config;
}

/**
 * Get configuration value safely
 * 
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Configuration value
 */
function getConfig(key, defaultValue = null) {
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Check if a feature is enabled based on configuration
 * 
 * @param {string} feature - Feature name
 * @returns {boolean} Whether the feature is enabled
 */
function isFeatureEnabled(feature) {
  switch (feature) {
    case 'blockchain':
      return !!(config.EVIDENCE_VAULT_CONTRACT && config.BLOCKCHAIN_PRIVATE_KEY);
    case 'sms':
      return !!(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN);
    case 'maps':
      return !!config.GOOGLE_MAPS_API_KEY;
    default:
      return false;
  }
}

/**
 * Get configuration summary (safe for logging)
 * Masks sensitive values
 * 
 * @returns {Object} Configuration summary
 */
function getConfigSummary() {
  const summary = {};
  
  for (const key of Object.keys(envSchema)) {
    const value = config[key];
    
    // Mask sensitive values
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
      summary[key] = value ? '***REDACTED***' : 'NOT_SET';
    } else {
      summary[key] = value || 'NOT_SET';
    }
  }

  return summary;
}

// Validate environment on module load
let config;
try {
  config = validateEnv();
  console.log('✅ Environment configuration validated successfully');
  
  // Log configuration summary in development
  if (config.NODE_ENV === 'development') {
    console.log('📋 Configuration Summary:');
    console.log(JSON.stringify(getConfigSummary(), null, 2));
  }
} catch (error) {
  console.error('❌ Failed to validate environment configuration');
  console.error(error.message);
  
  // In production, fail fast
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  
  // In development, use defaults but warn
  console.warn('⚠️  Using default configuration. Some features may not work.');
  config = {};
}

module.exports = {
  config,
  getConfig,
  isFeatureEnabled,
  getConfigSummary,
  validateEnv
};
