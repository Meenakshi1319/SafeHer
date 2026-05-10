# Migration Guide: Restructuring to Framework Architecture

This guide will help you migrate your existing SafeHer codebase to the new framework architecture.

## Migration Strategy

We'll use a **gradual migration** approach:
1. Create new structure alongside existing code
2. Migrate feature by feature
3. Update imports progressively
4. Remove old structure once complete

## Phase 1: Setup New Structure (Week 1)

### Step 1.1: Create Directory Structure

```bash
# Create main directories
mkdir -p src/features src/shared src/core src/config
mkdir -p src/shared/{components,hooks,utils,constants,types}
mkdir -p src/shared/components/{ui,layout,feedback}
mkdir -p src/core/{api,firebase,websocket,storage,navigation}

# Create feature directories
mkdir -p src/features/{auth,emergency,tracking,risk-assessment,ai,contacts,recording,decoy,checkin,community}

# For each feature, create subdirectories
for feature in auth emergency tracking risk-assessment ai contacts recording decoy checkin community; do
  mkdir -p src/features/$feature/{components,hooks,services,types,__tests__}
done

# Backend restructure
mkdir -p backend/src/{api,services,middleware,utils,config,websocket,types}
mkdir -p backend/src/api/{routes,controllers}
mkdir -p backend/src/websocket/handlers
```

### Step 1.2: Create Index Files

Create barrel exports for each feature:

```typescript
// src/features/emergency/index.ts
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
```

### Step 1.3: Update tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@core/*": ["./src/core/*"],
      "@config/*": ["./src/config/*"],
      "@components/*": ["./src/shared/components/*"],
      "@hooks/*": ["./src/shared/hooks/*"],
      "@utils/*": ["./src/shared/utils/*"],
      "@constants/*": ["./src/shared/constants/*"],
      "@types/*": ["./src/shared/types/*"]
    }
  }
}
```

## Phase 2: Migrate Shared Code (Week 1-2)

### Step 2.1: Move Constants

```bash
# Move existing constants
mv constants/theme.ts src/shared/constants/theme.ts
mv constants/riskLevels.ts src/shared/constants/riskLevels.ts
```

Create new constants:

```typescript
// src/shared/constants/config.ts
export const APP_CONFIG = {
  API_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  CACHE_DURATION: 300000,
} as const;

// src/shared/constants/routes.ts
export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
  },
  TABS: {
    HOME: '/(tabs)',
    SAFETY: '/(tabs)/safety',
    COMMUNITY: '/(tabs)/community',
    PROFILE: '/(tabs)/profile',
  },
} as const;
```

### Step 2.2: Move Shared Hooks

```bash
# Move existing hooks
mv hooks/use-color-scheme.ts src/shared/hooks/useColorScheme.ts
mv hooks/use-theme-color.ts src/shared/hooks/useThemeColor.ts
```

### Step 2.3: Move Shared Components

```bash
# Move UI components
mv components/themed-text.tsx src/shared/components/ui/Text.tsx
mv components/themed-view.tsx src/shared/components/ui/View.tsx
mv components/external-link.tsx src/shared/components/ui/Link.tsx
mv components/haptic-tab.tsx src/shared/components/ui/HapticTab.tsx
```

Refactor component structure:

```typescript
// src/shared/components/ui/Button.tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled }: ButtonProps) {
  const theme = useTheme();
  
  return (
    <Pressable
      style={[styles.button, styles[variant], disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}
```

### Step 2.4: Create Shared Utilities

```typescript
// src/shared/utils/validation.ts
export const validators = {
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  phone: (phone: string): boolean => {
    return /^\+?[\d\s-()]+$/.test(phone);
  },
  password: (password: string): boolean => {
    return password.length >= 8;
  },
};

// src/shared/utils/formatting.ts
export const formatters = {
  phone: (phone: string): string => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  },
  date: (date: Date): string => {
    return date.toLocaleDateString();
  },
};
```

## Phase 3: Migrate Features (Week 2-4)

### Step 3.1: Emergency Feature

```bash
# Move emergency components
mv components/SOSEscalationOverlay.tsx src/features/emergency/components/EscalationOverlay.tsx
mv hooks/useSOSEscalation.ts src/features/emergency/hooks/useSOSEscalation.ts
```

Create emergency service:

```typescript
// src/features/emergency/services/emergencyService.ts
import { apiClient } from '@core/api/client';
import type { EmergencyAlert, EmergencyResponse } from '../types';

export class EmergencyService {
  async triggerSOS(data: EmergencyAlert): Promise<EmergencyResponse> {
    return apiClient.post('/api/emergency/sos', data);
  }

  async cancelSOS(alertId: string): Promise<void> {
    return apiClient.post(`/api/emergency/cancel/${alertId}`);
  }

  async getActiveAlerts(): Promise<EmergencyAlert[]> {
    return apiClient.get('/api/emergency/active');
  }
}

export const emergencyService = new EmergencyService();
```

Create types:

```typescript
// src/features/emergency/types/index.ts
export interface EmergencyAlert {
  id: string;
  userId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  status: 'active' | 'cancelled' | 'resolved';
  escalationLevel: number;
}

export interface EmergencyResponse {
  alertId: string;
  notifiedContacts: string[];
  estimatedResponseTime: number;
}
```

### Step 3.2: AI Feature

```bash
# Move AI components
mv components/AIFloatingButton.tsx src/features/ai/components/AIFloatingButton.tsx
mv hooks/useShakeDetector.ts src/features/ai/hooks/useShakeDetector.ts
```

Create AI service:

```typescript
// src/features/ai/services/aiService.ts
import { apiClient } from '@core/api/client';

export class AIService {
  async analyzeRisk(data: RiskData): Promise<RiskScore> {
    return apiClient.post('/api/ai/risk-analysis', data);
  }

  async detectThreat(audioData: Blob): Promise<ThreatDetection> {
    const formData = new FormData();
    formData.append('audio', audioData);
    return apiClient.post('/api/ai/threat-detection', formData);
  }
}

export const aiService = new AIService();
```

### Step 3.3: Tracking Feature

Create tracking feature structure:

```typescript
// src/features/tracking/services/trackingService.ts
import { apiClient } from '@core/api/client';
import type { LocationUpdate, TrackingSession } from '../types';

export class TrackingService {
  async startTracking(userId: string): Promise<TrackingSession> {
    return apiClient.post('/api/tracking/start', { userId });
  }

  async updateLocation(location: LocationUpdate): Promise<void> {
    return apiClient.post('/api/tracking/location', location);
  }

  async stopTracking(sessionId: string): Promise<void> {
    return apiClient.post(`/api/tracking/stop/${sessionId}`);
  }
}

export const trackingService = new TrackingService();
```

### Step 3.4: Decoy Feature

```bash
# Move decoy components
mv components/FakeCallOverlay.tsx src/features/decoy/components/FakeCallOverlay.tsx
```

## Phase 4: Migrate Core Infrastructure (Week 3)

### Step 4.1: API Client

```typescript
// src/core/api/client.ts
import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '@config/env';
import { authInterceptor, errorInterceptor } from './interceptors';

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

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(authInterceptor);
    this.client.interceptors.response.use(
      (response) => response.data,
      errorInterceptor
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    return this.client.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.client.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.client.put(url, data, config);
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    return this.client.delete(url, config);
  }
}

export const apiClient = new APIClient();
```

```typescript
// src/core/api/interceptors.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosRequestConfig, AxiosError } from 'axios';

export async function authInterceptor(config: AxiosRequestConfig) {
  const token = await AsyncStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

export function errorInterceptor(error: AxiosError) {
  if (error.response?.status === 401) {
    // Handle unauthorized
    AsyncStorage.removeItem('authToken');
  }
  return Promise.reject(error);
}
```

### Step 4.2: Firebase Configuration

```typescript
// src/core/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Your config here
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const firestore = getFirestore(app);
```

### Step 4.3: WebSocket Client

```typescript
// src/core/websocket/client.ts
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '@config/env';

class WebSocketClient {
  private socket: Socket | null = null;

  connect(userId: string) {
    this.socket = io(WS_BASE_URL, {
      auth: { userId },
      transports: ['websocket'],
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket?.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket?.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const wsClient = new WebSocketClient();
```

## Phase 5: Migrate Backend (Week 4)

### Step 5.1: Restructure Routes

```javascript
// backend/src/api/routes/emergency.routes.js
const express = require('express');
const { emergencyController } = require('../controllers/emergency.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { validateEmergency } = require('../../middleware/validation.middleware');

const router = express.Router();

router.post('/sos', authMiddleware, validateEmergency, emergencyController.triggerSOS);
router.post('/cancel/:alertId', authMiddleware, emergencyController.cancelSOS);
router.get('/active', authMiddleware, emergencyController.getActiveAlerts);

module.exports = router;
```

### Step 5.2: Create Controllers

```javascript
// backend/src/api/controllers/emergency.controller.js
const { emergencyService } = require('../../services/emergency.service');
const { logger } = require('../../utils/logger');

class EmergencyController {
  async triggerSOS(req, res, next) {
    try {
      const result = await emergencyService.triggerSOS(req.body, req.user.id);
      res.json(result);
    } catch (error) {
      logger.error('SOS trigger failed:', error);
      next(error);
    }
  }

  async cancelSOS(req, res, next) {
    try {
      await emergencyService.cancelSOS(req.params.alertId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getActiveAlerts(req, res, next) {
    try {
      const alerts = await emergencyService.getActiveAlerts(req.user.id);
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { emergencyController: new EmergencyController() };
```

### Step 5.3: Extract Services

```javascript
// backend/src/services/emergency.service.js
const { db } = require('../config/firebase.config');
const { notificationService } = require('./notification.service');
const { logger } = require('../utils/logger');

class EmergencyService {
  async triggerSOS(data, userId) {
    const alert = {
      id: generateId(),
      userId,
      location: data.location,
      timestamp: new Date(),
      status: 'active',
      escalationLevel: 1,
    };

    await db.collection('emergencies').doc(alert.id).set(alert);
    await notificationService.notifyContacts(userId, alert);

    logger.info(`SOS triggered for user ${userId}`);
    return alert;
  }

  async cancelSOS(alertId, userId) {
    await db.collection('emergencies').doc(alertId).update({
      status: 'cancelled',
      cancelledAt: new Date(),
    });
  }

  async getActiveAlerts(userId) {
    const snapshot = await db
      .collection('emergencies')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(doc => doc.data());
  }
}

module.exports = { emergencyService: new EmergencyService() };
```

## Phase 6: Update App Structure (Week 4-5)

### Step 6.1: Reorganize Screens

```bash
# Move app directory to src
mv app src/app

# Reorganize auth screens
mkdir -p src/app/\(auth\)
mv src/app/login.tsx src/app/\(auth\)/login.tsx
mv src/app/register.tsx src/app/\(auth\)/register.tsx
```

### Step 6.2: Update Screen Imports

```typescript
// src/app/(tabs)/index.tsx
import { View, Text } from '@shared/components/ui';
import { useEmergency } from '@features/emergency';
import { useTracking } from '@features/tracking';
import { Button } from '@components/ui/Button';

export default function HomeScreen() {
  const { triggerSOS } = useEmergency();
  const { startTracking } = useTracking();

  return (
    <View>
      <Text>SafeHer Home</Text>
      <Button title="Emergency SOS" onPress={triggerSOS} variant="danger" />
    </View>
  );
}
```

## Phase 7: Testing & Validation (Week 5)

### Step 7.1: Update Tests

```typescript
// src/features/emergency/__tests__/emergencyService.test.ts
import { emergencyService } from '../services/emergencyService';
import { apiClient } from '@core/api/client';

jest.mock('@core/api/client');

describe('EmergencyService', () => {
  it('should trigger SOS successfully', async () => {
    const mockResponse = { alertId: '123', notifiedContacts: ['contact1'] };
    (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await emergencyService.triggerSOS({
      location: { latitude: 0, longitude: 0 },
    });

    expect(result).toEqual(mockResponse);
  });
});
```

### Step 7.2: Run Tests

```bash
# Frontend tests
npm test

# Backend tests
cd backend
npm test

# E2E tests
npm run test:e2e
```

## Phase 8: Cleanup (Week 5)

### Step 8.1: Remove Old Structure

```bash
# Remove old directories (after verifying everything works)
rm -rf components/
rm -rf hooks/
rm -rf constants/
rm -rf services/
```

### Step 8.2: Update Documentation

Update all documentation to reflect new structure.

## Rollback Plan

If issues arise:

1. Keep old structure until migration is complete
2. Use feature flags to toggle between old/new code
3. Maintain both import paths temporarily
4. Test thoroughly before removing old code

## Checklist

- [ ] Phase 1: Setup new structure
- [ ] Phase 2: Migrate shared code
- [ ] Phase 3: Migrate features
- [ ] Phase 4: Migrate core infrastructure
- [ ] Phase 5: Migrate backend
- [ ] Phase 6: Update app structure
- [ ] Phase 7: Testing & validation
- [ ] Phase 8: Cleanup

## Timeline

- **Week 1**: Phases 1-2
- **Week 2**: Phase 3 (Features 1-5)
- **Week 3**: Phase 3 (Features 6-10) + Phase 4
- **Week 4**: Phase 5 + Phase 6
- **Week 5**: Phase 7 + Phase 8

## Support

For questions or issues during migration, refer to:
- FRAMEWORK_ARCHITECTURE.md
- Team lead or senior developer
- Architecture decision records (ADRs)
