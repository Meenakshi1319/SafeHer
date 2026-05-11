# SafeHer Backend - Developer Guide

## Quick Reference for Code Quality Standards

This guide provides quick examples of how to use the new utilities and follow code quality standards.

---

## 1. Error Handling

### Use asyncHandler for all async routes

```javascript
const { asyncHandler } = require('../utils/errors');

// ✅ Good
router.post('/user', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  res.json({ success: true, data: user });
}));

// ❌ Bad
router.post('/user', async (req, res) => {
  try {
    const user = await createUser(req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### Throw custom errors

```javascript
const { ValidationError, NotFoundError } = require('../utils/errors');

// ✅ Good
if (!user) {
  throw new NotFoundError('User');
}

if (!email) {
  throw new ValidationError('Email is required');
}

// ❌ Bad
if (!user) {
  return res.status(404).json({ success: false, message: 'User not found' });
}
```

---

## 2. Validation

### Validate required fields

```javascript
const { validateRequired, validate } = require('../utils/validation');

// ✅ Good - Using middleware
router.post('/location', 
  validate((req) => {
    validateRequired(req.body, ['uid', 'latitude', 'longitude']);
  }),
  locationHandler
);

// ✅ Good - Inline validation
router.post('/user', asyncHandler(async (req, res) => {
  validateRequired(req.body, ['email', 'password']);
  // ... rest of handler
}));

// ❌ Bad
router.post('/user', (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
});
```

### Use validation functions

```javascript
const { isValidEmail, isValidPhone, sanitizeString } = require('../utils/validation');

// ✅ Good
if (!isValidEmail(email)) {
  throw new ValidationError('Invalid email format');
}

const safeName = sanitizeString(req.body.name);

// ❌ Bad
if (!email.includes('@')) {
  return res.status(400).json({ success: false, message: 'Invalid email' });
}
```

---

## 3. API Responses

### Use response formatters

```javascript
const { success, created, notFound } = require('../utils/response');

// ✅ Good
router.get('/user/:id', asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) return notFound(res, 'User');
  success(res, user, 'User retrieved');
}));

router.post('/user', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  created(res, user, 'User created successfully');
}));

// ❌ Bad
router.get('/user/:id', async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, data: user });
});
```

### Paginated responses

```javascript
const { paginated } = require('../utils/response');
const { validatePagination } = require('../utils/validation');

// ✅ Good
router.get('/users', asyncHandler(async (req, res) => {
  const { page, limit, skip } = validatePagination(req.query);
  const users = await User.find().skip(skip).limit(limit);
  const total = await User.countDocuments();
  paginated(res, users, page, limit, total);
}));
```

---

## 4. Logging

### Use logger instead of console.log

```javascript
const { logger } = require('../utils');

// ✅ Good
logger.info('User logged in', { userId, timestamp: new Date() });
logger.error('Database connection failed', { error: err.message });
logger.warn('API rate limit approaching', { usage: '90%' });
logger.debug('Cache hit', { key: 'user:123' });

// ❌ Bad
console.log('User logged in:', userId);
console.error('Error:', error);
```

### Use child loggers for context

```javascript
const { logger } = require('../utils');

// ✅ Good
const userLogger = logger.child({ userId: req.user.uid });
userLogger.info('Action performed', { action: 'update_profile' });
userLogger.info('Another action', { action: 'upload_photo' });
// Both logs will include userId automatically
```

---

## 5. Environment Configuration

### Access config safely

```javascript
const { getConfig, isFeatureEnabled } = require('../config/env');

// ✅ Good
const port = getConfig('PORT', 3000);

if (isFeatureEnabled('blockchain')) {
  await storeEvidenceOnChain(hash);
}

// ❌ Bad
const port = process.env.PORT || 3000;

if (process.env.EVIDENCE_VAULT_CONTRACT) {
  await storeEvidenceOnChain(hash);
}
```

---

## 6. Code Organization

### Controller Structure

```javascript
/**
 * User Controller
 * 
 * Handles user-related operations
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/errors');
const { success, created, notFound } = require('../utils/response');
const { validateRequired, validate } = require('../utils/validation');
const { logger } = require('../utils');

module.exports = function(middlewares) {
  const { requireAuth } = middlewares;

  // GET /users
  router.get('/users', requireAuth, asyncHandler(async (req, res) => {
    const users = await User.find();
    success(res, users, 'Users retrieved');
  }));

  // POST /users
  router.post('/users', 
    validate((req) => {
      validateRequired(req.body, ['email', 'password']);
    }),
    asyncHandler(async (req, res) => {
      const user = await User.create(req.body);
      logger.info('User created', { userId: user.id });
      created(res, user, 'User created successfully');
    })
  );

  return router;
};
```

---

## 7. Testing

### Write testable code

```javascript
// ✅ Good - Pure function, easy to test
function calculateRiskScore(incidents, location) {
  // ... calculation logic
  return score;
}

// ✅ Good - Dependency injection
class UserService {
  constructor(database, logger) {
    this.db = database;
    this.logger = logger;
  }

  async createUser(data) {
    this.logger.info('Creating user');
    return await this.db.users.create(data);
  }
}

// ❌ Bad - Hard to test
async function createUser(data) {
  console.log('Creating user');
  return await db.users.create(data); // Global db dependency
}
```

---

## 8. Security Best Practices

### Input Validation

```javascript
// ✅ Always validate and sanitize inputs
const { sanitizeString, validateRequired } = require('../utils/validation');

router.post('/comment', asyncHandler(async (req, res) => {
  validateRequired(req.body, ['text']);
  const safeText = sanitizeString(req.body.text);
  await Comment.create({ text: safeText });
  created(res, null, 'Comment created');
}));
```

### Error Messages

```javascript
// ✅ Good - Generic error in production
throw new AppError('Operation failed', 500);

// ❌ Bad - Exposes internal details
throw new Error(`Database connection failed: ${dbHost}:${dbPort}`);
```

### Secrets Management

```javascript
// ✅ Good - Use environment variables
const apiKey = getConfig('API_KEY');

// ❌ Bad - Hardcoded secrets
const apiKey = 'sk_live_abc123...';
```

---

## 9. Common Patterns

### CRUD Operations

```javascript
const { asyncHandler } = require('../utils/errors');
const { success, created, notFound } = require('../utils/response');
const { validateRequired } = require('../utils/validation');

// Create
router.post('/items', asyncHandler(async (req, res) => {
  validateRequired(req.body, ['name']);
  const item = await Item.create(req.body);
  created(res, item);
}));

// Read (single)
router.get('/items/:id', asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return notFound(res, 'Item');
  success(res, item);
}));

// Read (list)
router.get('/items', asyncHandler(async (req, res) => {
  const items = await Item.find();
  success(res, items);
}));

// Update
router.put('/items/:id', asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) return notFound(res, 'Item');
  success(res, item, 'Item updated');
}));

// Delete
router.delete('/items/:id', asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) return notFound(res, 'Item');
  success(res, null, 'Item deleted');
}));
```

---

## 10. Checklist for New Endpoints

Before committing new code, ensure:

- [ ] Uses `asyncHandler` for async routes
- [ ] Validates all required inputs
- [ ] Uses custom error classes
- [ ] Uses response formatters
- [ ] Uses logger instead of console.log
- [ ] Sanitizes user inputs
- [ ] Has proper error handling
- [ ] Returns consistent response format
- [ ] Includes JSDoc comments
- [ ] No hardcoded secrets
- [ ] No console.log statements
- [ ] Proper HTTP status codes

---

## 11. Quick Import Reference

```javascript
// Error handling
const { 
  asyncHandler, 
  ValidationError, 
  NotFoundError,
  AuthenticationError 
} = require('../utils/errors');

// Validation
const { 
  validateRequired, 
  validate,
  isValidEmail,
  sanitizeString 
} = require('../utils/validation');

// Responses
const { 
  success, 
  created, 
  notFound,
  badRequest 
} = require('../utils/response');

// Logging
const { logger } = require('../utils');

// Configuration
const { getConfig, isFeatureEnabled } = require('../config/env');

// All utilities at once
const { errors, validation, response, logger } = require('../utils');
```

---

## 12. Resources

- **Full Documentation:** `CODE_QUALITY_IMPROVEMENTS.md`
- **Error Classes:** `backend/src/utils/errors.js`
- **Validation Functions:** `backend/src/utils/validation.js`
- **Response Formatters:** `backend/src/utils/response.js`
- **Logger:** `backend/src/utils/logger.js`
- **Environment Config:** `backend/src/config/env.js`

---

**Remember:** Consistent code quality makes the codebase easier to maintain, debug, and scale! 🚀

