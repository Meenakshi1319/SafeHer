# 🔒 SafeHer - Deployment Security Checklist

Use this checklist before deploying SafeHer to production or pushing to GitHub.

---

## ✅ Pre-Deployment Security Checklist

### 1. Environment Variables

- [ ] All secrets moved to environment variables
- [ ] No hardcoded API keys in source code
- [ ] `.env` and `.env.local` files are gitignored
- [ ] Example files (`.env.example`) contain only placeholders
- [ ] `serviceAccountKey.json` is gitignored
- [ ] Environment validation script is working

### 2. Git Repository

- [ ] `.gitignore` is properly configured
- [ ] No sensitive files in git history
- [ ] No secrets in commit messages
- [ ] Uploaded files are gitignored
- [ ] Log files are gitignored
- [ ] Build artifacts are gitignored

### 3. API Key Security

- [ ] Firebase API keys restricted by HTTP referrer
- [ ] Google Maps API keys restricted by application
- [ ] Twilio credentials are server-side only
- [ ] OpenAI/Gemini keys are server-side only
- [ ] No API keys exposed in frontend bundle

### 4. Firebase Security

- [ ] Firestore security rules are configured
- [ ] Storage security rules are configured
- [ ] Firebase App Check is enabled (production)
- [ ] Service account key is secure
- [ ] Authentication methods are configured

### 5. Backend Security

- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Helmet.js security headers are active
- [ ] Input validation is implemented
- [ ] Error messages don't expose sensitive info
- [ ] Logs don't contain secrets

### 6. Code Quality

- [ ] No console.log with sensitive data
- [ ] No commented-out secrets
- [ ] No debug endpoints in production
- [ ] Dependencies are up to date
- [ ] No known security vulnerabilities

### 7. Documentation

- [ ] README doesn't contain real secrets
- [ ] Setup guide references example files
- [ ] Security notes are documented
- [ ] Contribution guidelines mention security

---

## 🔍 Security Scan Commands

### Check for exposed secrets

```bash
# Search for potential API keys
grep -r "AIza" --include="*.js" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .

# Search for potential private keys
grep -r "BEGIN PRIVATE KEY" --include="*.js" --include="*.ts" --exclude-dir=node_modules .

# Search for Twilio credentials
grep -r "AC[a-z0-9]{32}" --include="*.js" --include="*.ts" --exclude-dir=node_modules .
```

### Check git history for secrets

```bash
# Check if sensitive files were ever committed
git log --all --full-history --pretty=format:"%H" -- backend/.env
git log --all --full-history --pretty=format:"%H" -- backend/serviceAccountKey.json
git log --all --full-history --pretty=format:"%H" -- .env.local
```

### Verify .gitignore is working

```bash
# Check which files are ignored
git check-ignore -v .env.local backend/.env backend/serviceAccountKey.json

# List all ignored files
git status --ignored
```

---

## 🚨 If Secrets Were Committed

If you accidentally committed secrets to git:

### 1. Immediately Rotate All Exposed Credentials

- [ ] Regenerate Firebase service account key
- [ ] Rotate Gemini API key
- [ ] Rotate OpenAI API key
- [ ] Rotate Twilio auth token
- [ ] Regenerate Google Maps API key

### 2. Remove from Git History

**⚠️ WARNING:** This rewrites git history. Coordinate with your team.

```bash
# Remove a specific file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (only if you're sure!)
git push origin --force --all
```

**Better approach:** Use BFG Repo-Cleaner:

```bash
# Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove sensitive files
java -jar bfg.jar --delete-files .env
java -jar bfg.jar --delete-files serviceAccountKey.json

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

### 3. Verify Removal

```bash
# Search entire git history
git log --all --full-history --source -- backend/.env
```

---

## 🔐 Production Deployment Checklist

### Environment Configuration

- [ ] Production environment variables are set
- [ ] Database URLs point to production
- [ ] API keys are production keys (not development)
- [ ] CORS allows only production domains
- [ ] Rate limits are production-appropriate

### Firebase Configuration

- [ ] Firebase project is production project
- [ ] Firestore rules are restrictive
- [ ] Storage rules are restrictive
- [ ] App Check is enabled
- [ ] Authentication providers are configured

### Monitoring & Logging

- [ ] Error tracking is configured (Sentry, etc.)
- [ ] Logs don't contain sensitive data
- [ ] Monitoring alerts are set up
- [ ] Backup strategy is in place

### Performance & Scaling

- [ ] Database indexes are optimized
- [ ] CDN is configured for static assets
- [ ] Caching strategy is implemented
- [ ] Load testing is completed

---

## 📊 Security Audit Results

### Current Status: ✅ SECURE

| Category | Status | Notes |
|----------|--------|-------|
| Environment Variables | ✅ Secure | All secrets in .env files |
| Git History | ✅ Clean | No secrets committed |
| .gitignore | ✅ Configured | All sensitive files ignored |
| Source Code | ✅ Clean | No hardcoded secrets |
| API Key Restrictions | ⚠️ Pending | Set up in production |
| Firebase Security | ⚠️ Pending | Configure rules |

---

## 🛡️ Ongoing Security Practices

### Regular Audits

- [ ] Review dependencies monthly (`npm audit`)
- [ ] Update packages regularly
- [ ] Review Firebase security rules
- [ ] Check for exposed secrets
- [ ] Review access logs

### Access Control

- [ ] Limit who has access to production credentials
- [ ] Use separate development/production environments
- [ ] Implement least-privilege access
- [ ] Regular access reviews

### Incident Response

- [ ] Have a plan for credential leaks
- [ ] Know how to rotate all credentials quickly
- [ ] Document emergency contacts
- [ ] Test incident response procedures

---

## 📞 Security Contacts

### Report Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email the security team privately
3. Include detailed information
4. Allow time for a fix before disclosure

---

## ✅ Final Verification

Before pushing to GitHub:

```bash
# 1. Verify no secrets in staged files
git diff --cached | grep -i "api.*key\|secret\|token\|password"

# 2. Check .gitignore is working
git status --ignored

# 3. Verify environment files are ignored
git check-ignore .env.local backend/.env backend/serviceAccountKey.json

# 4. Run security audit
npm audit

# 5. Check for outdated packages
npm outdated
```

---

## 🎯 Ready to Deploy?

If all items are checked:

✅ **Your repository is secure and ready for GitHub!**

If any items are unchecked:

⚠️ **Complete remaining items before pushing to GitHub**

---

**Last Updated:** May 11, 2026  
**Next Review:** Before each major deployment
