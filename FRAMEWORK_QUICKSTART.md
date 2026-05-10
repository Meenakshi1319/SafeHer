# Framework Quick Start Guide

Get your SafeHer project restructured into a scalable framework in minutes!

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Setup Script

```bash
node scripts/setup-framework.js
```

This creates the entire framework directory structure automatically.

### Step 2: Verify Structure

Check that `src/` directory was created with:
- `features/` - Feature modules
- `shared/` - Shared components and utilities
- `core/` - Core infrastructure
- `config/` - Configuration files

### Step 3: Update Package Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "setup:framework": "node scripts/setup-framework.js",
    "migrate:feature": "node scripts/migrate-feature.js",
    "migrate:all": "node scripts/migrate-all-features.js"
  }
}
```

## 📦 Migrate Your First Feature (10 minutes)

### Option A: Automated Migration

```bash
# Migrate emergency feature
node scripts/migrate-feature.js emergency

# Migrate AI feature
node scripts/migrate-feature.js ai

# Migrate decoy feature
node scripts/migrate-feature.js decoy
```

### Option B: Manual Migration

1. **Move component files:**
   ```bash
   mv components/SOSEscalationOverlay.tsx src/features/emergency/components/
   ```

2. **Move hook files:**
   ```bash
   mv hooks/useSOSEscalation.ts src/features/emergency/hooks/
   ```

3. **Create service:**
   ```typescript
   // src/features/emergency/services/emergencyService.ts
   import { apiClient } from '@core/api/client';

   export class EmergencyService {
     async triggerSOS(data: any) {
       return apiClient.post('/api/emergency/sos', data);
     }
   }

   export const emergencyService = new EmergencyService();
   ```

4. **Update imports in your screen:**
   ```typescript
   // Before
   import { SOSEscalationOverlay } from '../../components/SOSEscalationOverlay';
   import { useSOSEscalation } from '../../hooks/useSOSEscalation';

   // After
   import { EscalationOverlay, useSOSEscalation } from '@features/emergency';
   ```

## 🎯 Using the New Structure

### Import Examples

```typescript
// Shared UI components
import { Button, Input, Card } from '@components/ui';

// Feature-specific code
import { useEmergency, EmergencyButton } from '@features/emergency';
import { useTracking } from '@features/tracking';
import { useRiskAssessment } from '@features/risk-assessment';

// Core infrastructure
import { apiClient } from '@core/api/client';
import { wsClient } from '@core/websocket/client';

// Constants and config
import { theme } from '@constants/theme';
import { ENV } from '@config/env';

// Utilities
import { validators } from '@utils/validation';
import { formatters } from '@utils/formatting';
```

### Creating a New Feature

```bash
# 1. Feature already has directory structure from setup
cd src/features/my-feature

# 2. Create a component
cat > components/MyComponent.tsx << 'EOF'
import { View, Text } from 'react-native';

export function MyComponent() {
  return (
    <View>
      <Text>My Feature Component</Text>
    </View>
  );
}
EOF

# 3. Create a hook
cat > hooks/useMyFeature.ts << 'EOF'
import { useState } from 'react';

export function useMyFeature() {
  const [state, setState] = useState(null);
  
  return { state, setState };
}
EOF

# 4. Create a service
cat > services/myFeatureService.ts << 'EOF'
import { apiClient } from '@core/api/client';

export class MyFeatureService {
  async getData() {
    return apiClient.get('/api/my-feature');
  }
}

export const myFeatureService = new MyFeatureService();
EOF

# 5. Export from index
cat > index.ts << 'EOF'
export * from './components';
export * from './hooks';
export * from './services';
EOF
```

## 📱 Update Your Screens

### Before (Old Structure)

```typescript
// app/(tabs)/index.tsx
import { View, Text, Pressable } from 'react-native';
import { SOSEscalationOverlay } from '../../components/SOSEscalationOverlay';
import { useSOSEscalation } from '../../hooks/useSOSEscalation';

export default function HomeScreen() {
  const { triggerSOS } = useSOSEscalation();
  
  return (
    <View>
      <Text>Home</Text>
      <Pressable onPress={triggerSOS}>
        <Text>SOS</Text>
      </Pressable>
      <SOSEscalationOverlay />
    </View>
  );
}
```

### After (New Structure)

```typescript
// app/(tabs)/index.tsx
import { View, Text } from '@components/ui';
import { Button } from '@components/ui/Button';
import { EscalationOverlay, useSOSEscalation } from '@features/emergency';

export default function HomeScreen() {
  const { triggerSOS } = useSOSEscalation();
  
  return (
    <View>
      <Text variant="h1">Home</Text>
      <Button 
        title="Emergency SOS" 
        onPress={triggerSOS}
        variant="danger"
      />
      <EscalationOverlay />
    </View>
  );
}
```

## 🧪 Testing Your Migration

### 1. Check TypeScript Compilation

```bash
npx tsc --noEmit
```

### 2. Run Tests

```bash
npm test
```

### 3. Start Development Server

```bash
npm start
```

### 4. Test on Device

```bash
# iOS
npm run ios

# Android
npm run android
```

## 🔍 Troubleshooting

### Import Errors

**Problem:** `Cannot find module '@features/emergency'`

**Solution:** 
1. Check `tsconfig.json` has path aliases
2. Restart TypeScript server in VS Code: `Cmd+Shift+P` → "Restart TS Server"
3. Clear Metro cache: `npm start -- --reset-cache`

### Module Resolution

**Problem:** Metro bundler can't resolve paths

**Solution:**
Add to `metro.config.js`:

```javascript
const path = require('path');

module.exports = {
  resolver: {
    extraNodeModules: {
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@components': path.resolve(__dirname, 'src/shared/components'),
      '@hooks': path.resolve(__dirname, 'src/shared/hooks'),
      '@utils': path.resolve(__dirname, 'src/shared/utils'),
      '@constants': path.resolve(__dirname, 'src/shared/constants'),
      '@types': path.resolve(__dirname, 'src/shared/types'),
    },
  },
};
```

### Circular Dependencies

**Problem:** Circular dependency warnings

**Solution:**
1. Use barrel exports (`index.ts`) carefully
2. Import specific files instead of from index
3. Restructure to remove circular references

## 📚 Next Steps

1. **Read Full Documentation**
   - [FRAMEWORK_ARCHITECTURE.md](./FRAMEWORK_ARCHITECTURE.md) - Complete architecture overview
   - [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Detailed migration steps

2. **Migrate Features Progressively**
   - Start with independent features (decoy, checkin)
   - Then core features (emergency, tracking)
   - Finally shared features (auth, contacts)

3. **Update Backend**
   - Restructure backend following same principles
   - Create controllers and services
   - Separate routes from business logic

4. **Write Tests**
   - Test each feature independently
   - Integration tests for feature interactions
   - E2E tests for critical flows

5. **Document Your Changes**
   - Update README with new structure
   - Document new patterns and conventions
   - Create ADRs for architectural decisions

## 💡 Pro Tips

1. **Use Feature Flags**: Toggle between old and new code during migration
2. **Migrate Incrementally**: One feature at a time, test thoroughly
3. **Keep Old Code**: Don't delete until new code is verified
4. **Update Gradually**: Both structures can coexist temporarily
5. **Team Communication**: Keep team informed of changes

## 🎉 Success Checklist

- [ ] Framework structure created
- [ ] Path aliases configured
- [ ] First feature migrated
- [ ] Imports updated
- [ ] Tests passing
- [ ] App runs successfully
- [ ] Team trained on new structure

## 🆘 Need Help?

- Check [FRAMEWORK_ARCHITECTURE.md](./FRAMEWORK_ARCHITECTURE.md) for design decisions
- Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed steps
- Look at migrated features as examples
- Ask team lead or senior developer

---

**Remember:** Migration is a journey, not a sprint. Take it one feature at a time! 🚀
