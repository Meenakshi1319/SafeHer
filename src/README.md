# SafeHer Source Code

This directory contains the restructured SafeHer application following a feature-based modular architecture.

## Directory Structure

- **features/**: Feature modules (auth, emergency, tracking, etc.)
- **shared/**: Shared code across features (components, hooks, utils)
- **core/**: Core infrastructure (API, Firebase, WebSocket)
- **config/**: Application configuration

## Import Aliases

Use these path aliases in your imports:

```typescript
import { Button } from '@components/ui/Button';
import { useEmergency } from '@features/emergency';
import { apiClient } from '@core/api/client';
import { theme } from '@constants/theme';
```

## Adding a New Feature

1. Create feature directory: `src/features/my-feature`
2. Add subdirectories: `components`, `hooks`, `services`, `types`, `__tests__`
3. Create `index.ts` with exports
4. Implement your feature
5. Export from feature index

## Guidelines

- Keep features independent
- Share common code via `shared/`
- Use TypeScript for type safety
- Write tests for all features
- Follow existing patterns

For more details, see FRAMEWORK_ARCHITECTURE.md
