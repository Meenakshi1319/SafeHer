#!/usr/bin/env node

/**
 * SafeHer Framework Setup Script
 * 
 * This script automates the creation of the new framework directory structure.
 * Run with: node scripts/setup-framework.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
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

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`✓ Created: ${dirPath}`, 'green');
  } else {
    log(`⊙ Exists: ${dirPath}`, 'yellow');
  }
}

function createFile(filePath, content = '') {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    log(`✓ Created: ${filePath}`, 'green');
  } else {
    log(`⊙ Exists: ${filePath}`, 'yellow');
  }
}

// Directory structure definition
const structure = {
  'src': {
    'features': {
      'auth': ['components', 'hooks', 'services', 'types', '__tests__'],
      'emergency': ['components', 'hooks', 'services', 'types', '__tests__'],
      'tracking': ['components', 'hooks', 'services', 'types', '__tests__'],
      'risk-assessment': ['components', 'hooks', 'services', 'types', 'utils', '__tests__'],
      'ai': ['components', 'hooks', 'services', 'types', '__tests__'],
      'contacts': ['components', 'hooks', 'services', 'types', '__tests__'],
      'recording': ['components', 'hooks', 'services', 'types', '__tests__'],
      'decoy': ['components', 'hooks', 'services', 'types', '__tests__'],
      'checkin': ['components', 'hooks', 'services', 'types', '__tests__'],
      'community': ['components', 'hooks', 'services', 'types', '__tests__'],
    },
    'shared': {
      'components': {
        'ui': [],
        'layout': [],
        'feedback': [],
      },
      'hooks': [],
      'utils': [],
      'constants': [],
      'types': [],
    },
    'core': {
      'api': [],
      'firebase': [],
      'websocket': [],
      'storage': [],
      'navigation': [],
    },
    'config': [],
  },
  'backend/src': {
    'api': {
      'routes': [],
      'controllers': [],
    },
    'services': [],
    'middleware': [],
    'utils': [],
    'config': [],
    'websocket': {
      'handlers': [],
    },
    'types': [],
  },
  'docs': [],
  'scripts': [],
};

function createStructure(base, struct, currentPath = '') {
  for (const [key, value] of Object.entries(struct)) {
    const fullPath = path.join(base, currentPath, key);
    createDirectory(fullPath);

    if (Array.isArray(value)) {
      // Create subdirectories
      value.forEach(subDir => {
        createDirectory(path.join(fullPath, subDir));
      });
    } else if (typeof value === 'object') {
      // Recursively create nested structure
      createStructure(base, value, path.join(currentPath, key));
    }
  }
}

function createIndexFiles() {
  log('\n📝 Creating index files...', 'blue');

  const features = [
    'auth', 'emergency', 'tracking', 'risk-assessment', 'ai',
    'contacts', 'recording', 'decoy', 'checkin', 'community'
  ];

  features.forEach(feature => {
    const indexPath = path.join('src', 'features', feature, 'index.ts');
    const content = `// ${feature} feature exports
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
`;
    createFile(indexPath, content);
  });

  // Shared components index
  const sharedIndexPath = path.join('src', 'shared', 'components', 'index.ts');
  const sharedContent = `// Shared components exports
export * from './ui';
export * from './layout';
export * from './feedback';
`;
  createFile(sharedIndexPath, sharedContent);
}

function createConfigFiles() {
  log('\n⚙️  Creating configuration files...', 'blue');

  // Environment config
  const envConfigPath = path.join('src', 'config', 'env.ts');
  const envContent = `import Constants from 'expo-constants';

export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
export const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export const ENV = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
  apiUrl: API_BASE_URL,
  wsUrl: WS_BASE_URL,
};
`;
  createFile(envConfigPath, envContent);

  // API client
  const apiClientPath = path.join('src', 'core', 'api', 'client.ts');
  const apiContent = `import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '@config/env';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();
`;
  createFile(apiClientPath, apiContent);
}

function updateTsConfig() {
  log('\n📋 Updating tsconfig.json...', 'blue');

  const tsConfigPath = 'tsconfig.json';
  
  if (fs.existsSync(tsConfigPath)) {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
    
    tsConfig.compilerOptions = tsConfig.compilerOptions || {};
    tsConfig.compilerOptions.baseUrl = '.';
    tsConfig.compilerOptions.paths = {
      '@/*': ['./src/*'],
      '@features/*': ['./src/features/*'],
      '@shared/*': ['./src/shared/*'],
      '@core/*': ['./src/core/*'],
      '@config/*': ['./src/config/*'],
      '@components/*': ['./src/shared/components/*'],
      '@hooks/*': ['./src/shared/hooks/*'],
      '@utils/*': ['./src/shared/utils/*'],
      '@constants/*': ['./src/shared/constants/*'],
      '@types/*': ['./src/shared/types/*'],
    };

    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    log('✓ Updated tsconfig.json with path aliases', 'green');
  } else {
    log('⚠ tsconfig.json not found', 'yellow');
  }
}

function createReadme() {
  log('\n📖 Creating framework README...', 'blue');

  const readmePath = path.join('src', 'README.md');
  const content = `# SafeHer Source Code

This directory contains the restructured SafeHer application following a feature-based modular architecture.

## Directory Structure

- **features/**: Feature modules (auth, emergency, tracking, etc.)
- **shared/**: Shared code across features (components, hooks, utils)
- **core/**: Core infrastructure (API, Firebase, WebSocket)
- **config/**: Application configuration

## Import Aliases

Use these path aliases in your imports:

\`\`\`typescript
import { Button } from '@components/ui/Button';
import { useEmergency } from '@features/emergency';
import { apiClient } from '@core/api/client';
import { theme } from '@constants/theme';
\`\`\`

## Adding a New Feature

1. Create feature directory: \`src/features/my-feature\`
2. Add subdirectories: \`components\`, \`hooks\`, \`services\`, \`types\`, \`__tests__\`
3. Create \`index.ts\` with exports
4. Implement your feature
5. Export from feature index

## Guidelines

- Keep features independent
- Share common code via \`shared/\`
- Use TypeScript for type safety
- Write tests for all features
- Follow existing patterns

For more details, see FRAMEWORK_ARCHITECTURE.md
`;
  createFile(readmePath, content);
}

// Main execution
function main() {
  log('\n🚀 SafeHer Framework Setup\n', 'blue');
  log('This script will create the new framework directory structure.\n');

  const rootDir = process.cwd();
  
  log('📁 Creating directory structure...', 'blue');
  createStructure(rootDir, structure);

  createIndexFiles();
  createConfigFiles();
  updateTsConfig();
  createReadme();

  log('\n✅ Framework setup complete!', 'green');
  log('\nNext steps:', 'blue');
  log('1. Review the created structure in src/');
  log('2. Read MIGRATION_GUIDE.md for migration instructions');
  log('3. Start migrating features one by one');
  log('4. Update imports to use new path aliases\n');
}

// Run the script
try {
  main();
} catch (error) {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
}
