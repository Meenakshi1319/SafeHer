#!/usr/bin/env node

/**
 * SafeHer Feature Migration Script
 * 
 * This script helps migrate a specific feature to the new framework structure.
 * Run with: node scripts/migrate-feature.js <feature-name>
 * 
 * Example: node scripts/migrate-feature.js emergency
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function moveFile(source, destination) {
  if (fs.existsSync(source)) {
    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(source, destination);
    log(`✓ Moved: ${source} → ${destination}`, 'green');
    return true;
  } else {
    log(`⚠ Not found: ${source}`, 'yellow');
    return false;
  }
}

function updateImports(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Update common import patterns
  const replacements = [
    { from: /from ['"]\.\.\/\.\.\/components\//g, to: "from '@components/" },
    { from: /from ['"]\.\.\/\.\.\/hooks\//g, to: "from '@hooks/" },
    { from: /from ['"]\.\.\/\.\.\/constants\//g, to: "from '@constants/" },
    { from: /from ['"]\.\.\/\.\.\/utils\//g, to: "from '@utils/" },
    { from: /from ['"]\.\.\/\.\.\/services\//g, to: "from '@core/api/" },
    { from: /from ['"]@\/components\//g, to: "from '@components/" },
    { from: /from ['"]@\/hooks\//g, to: "from '@hooks/" },
  ];

  replacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(filePath, content);
    log(`✓ Updated imports in: ${filePath}`, 'green');
  }
}

function migrateFeature(featureName) {
  log(`\n🔄 Migrating feature: ${featureName}\n`, 'blue');

  const featureDir = path.join('src', 'features', featureName);
  
  if (!fs.existsSync(featureDir)) {
    log(`❌ Feature directory not found: ${featureDir}`, 'red');
    log('Run setup-framework.js first to create the structure.', 'yellow');
    return;
  }

  // Migration mappings based on feature
  const migrations = {
    emergency: [
      {
        source: 'components/SOSEscalationOverlay.tsx',
        dest: path.join(featureDir, 'components', 'EscalationOverlay.tsx'),
      },
      {
        source: 'hooks/useSOSEscalation.ts',
        dest: path.join(featureDir, 'hooks', 'useSOSEscalation.ts'),
      },
    ],
    ai: [
      {
        source: 'components/AIFloatingButton.tsx',
        dest: path.join(featureDir, 'components', 'AIFloatingButton.tsx'),
      },
      {
        source: 'hooks/useShakeDetector.ts',
        dest: path.join(featureDir, 'hooks', 'useShakeDetector.ts'),
      },
    ],
    decoy: [
      {
        source: 'components/FakeCallOverlay.tsx',
        dest: path.join(featureDir, 'components', 'FakeCallOverlay.tsx'),
      },
    ],
  };

  const featureMigrations = migrations[featureName] || [];
  
  if (featureMigrations.length === 0) {
    log(`⚠ No automatic migrations defined for feature: ${featureName}`, 'yellow');
    log('You\'ll need to manually move files to the feature directory.', 'yellow');
    return;
  }

  let movedCount = 0;
  featureMigrations.forEach(({ source, dest }) => {
    if (moveFile(source, dest)) {
      movedCount++;
      updateImports(dest);
    }
  });

  // Create feature index
  const indexPath = path.join(featureDir, 'index.ts');
  const indexContent = `// ${featureName} feature exports
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
`;
  
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, indexContent);
    log(`✓ Created: ${indexPath}`, 'green');
  }

  // Create types file
  const typesPath = path.join(featureDir, 'types', 'index.ts');
  const typesContent = `// ${featureName} feature types
export interface ${capitalize(featureName)}State {
  // Add your state types here
}

export interface ${capitalize(featureName)}Config {
  // Add your config types here
}
`;
  
  if (!fs.existsSync(typesPath)) {
    fs.mkdirSync(path.dirname(typesPath), { recursive: true });
    fs.writeFileSync(typesPath, typesContent);
    log(`✓ Created: ${typesPath}`, 'green');
  }

  log(`\n✅ Migration complete! Moved ${movedCount} file(s).`, 'green');
  log('\nNext steps:', 'blue');
  log(`1. Review migrated files in ${featureDir}`);
  log('2. Create service layer if needed');
  log('3. Update screen imports to use new paths');
  log('4. Run tests to verify everything works\n');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Main execution
const featureName = process.argv[2];

if (!featureName) {
  log('\n❌ Error: Feature name required', 'red');
  log('\nUsage: node scripts/migrate-feature.js <feature-name>', 'yellow');
  log('\nAvailable features:', 'blue');
  log('  - auth');
  log('  - emergency');
  log('  - tracking');
  log('  - risk-assessment');
  log('  - ai');
  log('  - contacts');
  log('  - recording');
  log('  - decoy');
  log('  - checkin');
  log('  - community\n');
  process.exit(1);
}

try {
  migrateFeature(featureName);
} catch (error) {
  log(`\n❌ Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}
