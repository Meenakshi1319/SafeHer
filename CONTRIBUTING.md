# Contributing to SafeHer

Thank you for your interest in contributing to SafeHer! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Gender, gender identity, or expression
- Sexual orientation
- Disability
- Physical appearance
- Race or ethnicity
- Age
- Religion or belief system

### Expected Behavior

- Be respectful and considerate in communication
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept responsibility for mistakes and learn from them
- Prioritize the safety and well-being of users

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting, or derogatory remarks
- Publishing others' private information without consent
- Any conduct that could be considered inappropriate in a professional setting

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Firebase account (for testing)
- Expo CLI (for mobile development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/safeher.git
   cd safeher
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/safeher.git
   ```

### Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env` in backend directory
2. Copy `.env.local.example` to `.env.local` in root directory
3. Fill in your Firebase credentials and API keys
4. Download `serviceAccountKey.json` from Firebase Console

### Run Development Servers

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
npx expo start
```

## Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

**Examples:**
- `feature/offline-mode`
- `fix/sos-button-crash`
- `docs/api-endpoints`

### Workflow Steps

1. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add offline mode support"
   ```

3. **Keep your branch updated:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

## Coding Standards

### JavaScript/TypeScript

- Use **TypeScript** for new frontend code
- Use **ESLint** for linting (run `npm run lint`)
- Use **Prettier** for formatting (if configured)
- Follow **camelCase** for variables and functions
- Follow **PascalCase** for components and classes
- Use **UPPER_SNAKE_CASE** for constants

### Code Style

**Good:**
```javascript
// Clear, descriptive names
const userRiskScore = calculateRiskScore(sensorData);

// Proper error handling
try {
  await saveToFirestore(data);
} catch (error) {
  console.error('Failed to save:', error);
  throw new Error('Database save failed');
}

// Documented functions
/**
 * Calculates risk score based on sensor inputs
 * @param {Object} sensorData - Raw sensor readings
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(sensorData) {
  // Implementation
}
```

**Bad:**
```javascript
// Vague names
const x = calc(d);

// Silent failures
try {
  await save(data);
} catch (e) {}

// No documentation
function calc(d) {
  // What does this do?
}
```

### File Organization

```
backend/
├── routes/          # API route handlers
├── middleware/      # Express middleware
├── services/        # Business logic
├── utils/           # Helper functions
└── __tests__/       # Test files

app/
├── (tabs)/          # Tab screens
├── components/      # Reusable components
├── services/        # API clients, Firebase
├── hooks/           # Custom React hooks
└── constants/       # App constants
```

## Testing Guidelines

### Writing Tests

**Unit Tests:**
```javascript
describe('validateUid', () => {
  test('should accept valid UIDs', () => {
    expect(validateUid('user123')).toBe(true);
  });

  test('should reject invalid UIDs', () => {
    expect(validateUid('')).toBe(false);
    expect(validateUid('user@123')).toBe(false);
  });
});
```

**Integration Tests:**
```javascript
test('POST /contacts/:uid adds a contact', async () => {
  const res = await request(app)
    .post('/contacts/user123')
    .send({
      name: 'Mom',
      phone: '+911234567890',
      type: 'family'
    });
  
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});
```

### Running Tests

```bash
# Backend unit tests
cd backend
npm run test:unit

# Backend integration tests
npm run test:integration

# Frontend linting
cd ..
npm run lint
```

### Test Coverage

- Aim for **70%+ code coverage** for new features
- All bug fixes must include a regression test
- Critical paths (SOS, authentication) require 100% coverage

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks (dependencies, build config)

### Examples

```
feat(sos): add 3-cycle warning before escalation

Implements a 30-second warning period with 3 cycles of 10 seconds each.
Users can cancel during this period by tapping "I AM SAFE".

Closes #123
```

```
fix(auth): prevent token refresh loop

Fixed infinite loop when Firebase token expires during active session.
Now properly handles token refresh and retries failed requests.

Fixes #456
```

```
docs(api): add endpoint documentation for /trigger-sos

Added detailed API documentation including request/response examples,
validation rules, and rate limiting information.
```

### Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be ≤72 characters
- Reference issues/PRs in footer

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new features
- [ ] Documentation updated (README, API docs, comments)
- [ ] No console.log statements (use proper logging)
- [ ] No commented-out code
- [ ] Commit messages follow guidelines

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
```

### Review Process

1. **Automated Checks:** CI/CD runs tests and linting
2. **Code Review:** At least one maintainer reviews
3. **Feedback:** Address review comments
4. **Approval:** Maintainer approves PR
5. **Merge:** Maintainer merges to main branch

### Review Criteria

- **Functionality:** Does it work as intended?
- **Code Quality:** Is it readable and maintainable?
- **Testing:** Are there adequate tests?
- **Security:** Are there any security concerns?
- **Performance:** Does it impact performance?
- **Documentation:** Is it properly documented?

## Areas for Contribution

### High Priority

- [ ] Offline mode with local queue
- [ ] Push notifications (FCM/APNs)
- [ ] ML-based threat prediction
- [ ] Admin dashboard
- [ ] Multi-language support (i18n)

### Good First Issues

- [ ] Add more unit tests
- [ ] Improve error messages
- [ ] Add JSDoc comments
- [ ] Fix UI/UX bugs
- [ ] Update documentation

### Feature Requests

Check [GitHub Issues](https://github.com/yourusername/safeher/issues) for requested features and vote with 👍 reactions.

## Questions?

- **General Questions:** Open a [Discussion](https://github.com/yourusername/safeher/discussions)
- **Bug Reports:** Open an [Issue](https://github.com/yourusername/safeher/issues)
- **Security Issues:** Email security@safeher.app (do not open public issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to SafeHer and helping make the world safer! 🛡️**
