/**
 * Environment Variable Validation Utility
 * Validates required environment variables on backend startup
 * Prevents application from running with missing or invalid configuration
 */

const chalk = require('chalk');

/**
 * Environment variable definitions with validation rules
 */
const ENV_SCHEMA = {
  // Server Configuration
  PORT: {
    required: true,
    type: 'number',
    default: 5000,
    description: 'Backend server port'
  },
  BACKEND_URL: {
    required: false,
    type: 'string',
    description: 'Backend URL for external access'
  },

  // Firebase Configuration
  FIREBASE_STORAGE_BUCKET: {
    required: true,
    type: 'string',
    validate: (val) => val.includes('.appspot.com') || val.includes('.firebasestorage.app'),
    description: 'Firebase Storage bucket URL'
  },

  // AI API Keys
  GEMINI_API_KEY: {
    required: true,
    type: 'string',
    validate: (val) => val.startsWith('AIza') && val.length > 30,
    description: 'Google Gemini AI API key'
  },
  OPENAI_API_KEY: {
    required: false,
    type: 'string',
    validate: (val) => !val || val.startsWith('sk-'),
    description: 'OpenAI API key (optional)'
  },

  // Twilio SMS Configuration
  TWILIO_SID: {
    required: true,
    type: 'string',
    validate: (val) => val.startsWith('AC') && val.length === 34,
    description: 'Twilio Account SID'
  },
  TWILIO_TOKEN: {
    required: true,
    type: 'string',
    validate: (val) => val.length === 32,
    description: 'Twilio Auth Token'
  },
  TWILIO_PHONE: {
    required: true,
    type: 'string',
    validate: (val) => val.startsWith('+') && val.length >= 10,
    description: 'Twilio phone number (E.164 format)'
  },

  // Google Maps API
  GOOGLE_MAPS_API_KEY: {
    required: false,
    type: 'string',
    validate: (val) => !val || val.startsWith('AIza'),
    description: 'Google Maps API key (optional)'
  },

  // Blockchain Configuration (Optional)
  POLYGON_RPC_URL: {
    required: false,
    type: 'string',
    description: 'Polygon RPC URL for blockchain features'
  },
  EVIDENCE_VAULT_CONTRACT: {
    required: false,
    type: 'string',
    description: 'Evidence Vault smart contract address'
  },
  BLOCKCHAIN_PRIVATE_KEY: {
    required: false,
    type: 'string',
    validate: (val) => !val || val.length === 64 || val.startsWith('0x'),
    description: 'Blockchain wallet private key'
  }
};

/**
 * Validates a single environment variable
 */
function validateEnvVar(key, schema) {
  const value = process.env[key];
  const errors = [];
  const warnings = [];

  // Check if required
  if (schema.required && !value) {
    errors.push(`${key} is required but not set`);
    return { valid: false, errors, warnings };
  }

  // If not set and not required, use default or skip
  if (!value) {
    if (schema.default !== undefined) {
      process.env[key] = String(schema.default);
      warnings.push(`${key} not set, using default: ${schema.default}`);
    }
    return { valid: true, errors, warnings };
  }

  // Type validation
  if (schema.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) {
      errors.push(`${key} must be a number, got: ${value}`);
    }
  }

  // Custom validation
  if (schema.validate && !schema.validate(value)) {
    errors.push(`${key} failed validation: ${schema.description}`);
  }

  // Security check: detect placeholder values
  const placeholders = [
    'your_',
    'YOUR_',
    'change_me',
    'CHANGE_ME',
    'example',
    'EXAMPLE',
    'placeholder',
    'PLACEHOLDER'
  ];
  
  if (placeholders.some(p => value.includes(p))) {
    errors.push(`${key} contains placeholder value. Please set a real value.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates all environment variables
 */
function validateEnvironment() {
  console.log(chalk.blue('\n🔍 Validating Environment Configuration...\n'));

  const results = {
    valid: true,
    errors: [],
    warnings: [],
    missing: [],
    configured: []
  };

  // Validate each environment variable
  for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
    const result = validateEnvVar(key, schema);

    if (!result.valid) {
      results.valid = false;
      results.errors.push(...result.errors.map(err => `  ❌ ${err}`));
    }

    if (result.warnings.length > 0) {
      results.warnings.push(...result.warnings.map(warn => `  ⚠️  ${warn}`));
    }

    if (process.env[key]) {
      results.configured.push(key);
    } else if (schema.required) {
      results.missing.push(key);
    }
  }

  // Print results
  if (results.configured.length > 0) {
    console.log(chalk.green('✅ Configured Variables:'));
    results.configured.forEach(key => {
      const value = process.env[key];
      const masked = maskSensitiveValue(key, value);
      console.log(chalk.gray(`   ${key}: ${masked}`));
    });
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Warnings:'));
    results.warnings.forEach(warn => console.log(chalk.yellow(warn)));
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log(chalk.red('❌ Errors:'));
    results.errors.forEach(err => console.log(chalk.red(err)));
    console.log('');
  }

  if (results.missing.length > 0) {
    console.log(chalk.red('❌ Missing Required Variables:'));
    results.missing.forEach(key => {
      const schema = ENV_SCHEMA[key];
      console.log(chalk.red(`   ${key}: ${schema.description}`));
    });
    console.log('');
  }

  // Final verdict
  if (!results.valid) {
    console.log(chalk.red('❌ Environment validation failed!'));
    console.log(chalk.yellow('\n💡 To fix:'));
    console.log(chalk.yellow('   1. Copy backend/.env.example to backend/.env'));
    console.log(chalk.yellow('   2. Fill in all required values'));
    console.log(chalk.yellow('   3. Restart the server\n'));
    process.exit(1);
  }

  console.log(chalk.green('✅ Environment validation passed!\n'));
  return results;
}

/**
 * Masks sensitive values for logging
 */
function maskSensitiveValue(key, value) {
  if (!value) return '(not set)';

  const sensitiveKeys = [
    'KEY', 'TOKEN', 'SECRET', 'PASSWORD', 'PRIVATE',
    'SID', 'AUTH', 'CREDENTIAL'
  ];

  const isSensitive = sensitiveKeys.some(k => key.includes(k));

  if (isSensitive) {
    if (value.length <= 8) {
      return '***';
    }
    return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
  }

  return value;
}

/**
 * Checks if a feature is enabled based on environment variables
 */
function isFeatureEnabled(feature) {
  switch (feature) {
    case 'blockchain':
      return !!(
        process.env.POLYGON_RPC_URL &&
        process.env.EVIDENCE_VAULT_CONTRACT &&
        process.env.BLOCKCHAIN_PRIVATE_KEY
      );
    case 'sms':
      return !!(
        process.env.TWILIO_SID &&
        process.env.TWILIO_TOKEN &&
        process.env.TWILIO_PHONE
      );
    case 'ai':
      return !!(
        process.env.GEMINI_API_KEY ||
        process.env.OPENAI_API_KEY
      );
    case 'maps':
      return !!process.env.GOOGLE_MAPS_API_KEY;
    default:
      return false;
  }
}

/**
 * Prints feature availability status
 */
function printFeatureStatus() {
  console.log(chalk.blue('📦 Feature Availability:\n'));

  const features = [
    { name: 'SMS Alerts (Twilio)', key: 'sms' },
    { name: 'AI Analysis (Gemini)', key: 'ai' },
    { name: 'Google Maps', key: 'maps' },
    { name: 'Blockchain Evidence', key: 'blockchain' }
  ];

  features.forEach(({ name, key }) => {
    const enabled = isFeatureEnabled(key);
    const status = enabled ? chalk.green('✅ Enabled') : chalk.gray('⚪ Disabled');
    console.log(`   ${name}: ${status}`);
  });

  console.log('');
}

module.exports = {
  validateEnvironment,
  isFeatureEnabled,
  printFeatureStatus,
  ENV_SCHEMA
};
