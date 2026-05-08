# SafeHer - Testing Guide

Quick reference for testing the SafeHer application.

---

## 🚀 Quick Start

### 1. Verify Configuration
```bash
cd backend
node verify_fixes.js
```

This will check:
- ✅ Environment variables
- ✅ Firebase configuration
- ✅ Required directories
- ✅ Service connections

---

## 🧪 Backend Tests

### Start Backend Server
```bash
cd backend
node server.js
```

**Expected Output:**
```
╔══════════════════════════════════════════════════════════╗
║        🚀  SafeHer Backend running on port 5000          ║
╚══════════════════════════════════════════════════════════╝
```

---

### Test 1: Firestore Connection
```bash
cd backend
node test_firestore.js
```

**Expected Output:**
```
Testing Firestore with REST mode...
✅ SUCCESS! Firestore is working!
```

---

### Test 2: AI Chat Endpoint
```bash
cd backend
node test_ai.js
```

**Expected Output (if quota available):**
```
AI Response: ✅
[Helpful safety advice from Gemini AI]
```

**Expected Output (if quota exceeded):**
```
AI Response: ✅
[Fallback safety advice from local responses]
```

---

### Test 3: Full Integration Test
```bash
cd backend
node test_integration.js
```

**Expected Output:**
```
═══════════════════════════════════════
  SafeHer Integration Test Suite
═══════════════════════════════════════

1️⃣  POST /signup — Create test account...
   ✅ PASS — UID: [generated-uid]

2️⃣  GET /user/:uid — Fetch user profile...
   ✅ PASS — Email: test_[timestamp]@safeher.com

3️⃣  POST /contacts/:uid — Add emergency contact...
   ✅ PASS — Contact added

4️⃣  GET /contacts/:uid — Fetch contacts...
   ✅ PASS — 1 contact(s) found

5️⃣  DELETE /contacts/:uid/:cid — Delete contact...
   ✅ PASS — Contact deleted

6️⃣  POST /save-location — Save GPS coordinates...
   ✅ PASS — Location saved

7️⃣  POST /update-risk — Update risk score...
   ✅ PASS — Risk score: 20

8️⃣  GET /risk/:uid — Get current risk...
   ✅ PASS — Score: 20, Level: LOW

9️⃣  POST /sensor/shake — Shake event...
   ✅ PASS — Shake registered, risk: 40

═══════════════════════════════════════
  Results: 9 passed, 0 failed out of 9
═══════════════════════════════════════

🎉 ALL TESTS PASSED! Backend + Firebase fully integrated!
```

---

## 📱 Frontend Tests

### Lint Check
```bash
npm run lint
```

**Expected Output:**
```
> safeher-native@1.0.0 lint
> expo lint

[No errors found]
```

---

### Start Development Server
```bash
npm start
```

**Expected Output:**
```
› Metro waiting on exp://[your-ip]:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

### Run on Android
```bash
npm run android
```

---

### Run on iOS
```bash
npm run ios
```

---

## 🔍 Manual Testing Checklist

### Authentication Flow
- [ ] User can register with email/password
- [ ] User can login with email/password
- [ ] User profile is created in Firestore
- [ ] Session persists after app restart

### Emergency Contacts
- [ ] User can add emergency contacts
- [ ] User can view contact list
- [ ] User can delete contacts
- [ ] Contacts are saved to Firestore

### Risk Score System
- [ ] Shake detection increases risk score
- [ ] Risk score displays correctly
- [ ] Risk level changes based on score
- [ ] Risk history is saved

### Location Tracking
- [ ] App requests location permission
- [ ] Location is tracked in background
- [ ] Location is saved to Firestore
- [ ] Location updates in real-time

### SOS Features
- [ ] Manual SOS button works
- [ ] Shake detection triggers alert
- [ ] Emergency contacts receive SMS (if configured)
- [ ] Alert is logged in Firestore

### Evidence Recording
- [ ] Video recording starts on high risk
- [ ] Audio recording works
- [ ] Files are uploaded (or saved locally)
- [ ] Recording metadata is saved

### AI Chatbot
- [ ] Chat interface loads
- [ ] User can send messages
- [ ] AI responds with safety advice
- [ ] Fallback responses work when quota exceeded

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 5000 is already in use
netstat -ano | findstr :5000

# Kill the process if needed
taskkill /PID [process-id] /F

# Restart backend
cd backend
node server.js
```

---

### Firebase Connection Issues
```bash
# Verify configuration
cd backend
node verify_fixes.js

# Check if serviceAccountKey.json exists
dir serviceAccountKey.json

# Check .env file
type .env
```

---

### Frontend Build Issues
```bash
# Clear cache
npm start -- --clear

# Reinstall dependencies
rm -rf node_modules
npm install

# Reset Expo
npm run reset-project
```

---

### Test Failures
1. **Check backend is running** on port 5000
2. **Verify Firebase configuration** with `verify_fixes.js`
3. **Check logs** in `backend/logs/[date].log`
4. **Review error messages** in test output

---

## 📊 Test Coverage

### Backend API Endpoints
- ✅ POST /signup
- ✅ POST /login
- ✅ POST /logout
- ✅ GET /user/:uid
- ✅ POST /contacts/:uid
- ✅ GET /contacts/:uid
- ✅ DELETE /contacts/:uid/:cid
- ✅ POST /save-location
- ✅ POST /update-risk
- ✅ POST /reset-risk
- ✅ GET /risk/:uid
- ✅ POST /sensor/shake
- ✅ POST /sensor/sound
- ✅ POST /sensor/voice
- ✅ POST /trigger-sos
- ✅ POST /upload-evidence
- ✅ GET /recordings/:uid
- ✅ POST /ai/chat

### Frontend Components
- ✅ Login screen
- ✅ Register screen
- ✅ Home/Dashboard
- ✅ Emergency contacts
- ✅ Risk score display
- ✅ Map view
- ✅ AI chatbot
- ✅ Settings

---

## 📝 Test Reports

After running tests, check these files:
- `TEST_REPORT.md` - Comprehensive test results
- `FIXES_APPLIED.md` - Summary of fixes
- `backend/logs/[date].log` - Detailed server logs

---

## 🎯 Performance Testing

### Load Testing (Optional)
```bash
# Install Apache Bench (if not installed)
# Windows: Download from Apache website

# Test signup endpoint
ab -n 100 -c 10 -p signup.json -T application/json http://localhost:5000/signup

# Test location endpoint
ab -n 1000 -c 50 -p location.json -T application/json http://localhost:5000/save-location
```

---

## 🔐 Security Testing

### Checklist
- [ ] API keys not exposed in client code
- [ ] Firebase rules properly configured
- [ ] Authentication required for protected routes
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (N/A - using Firestore)
- [ ] XSS prevention in chat responses

---

## 📞 Getting Help

If tests fail:
1. Run `node backend/verify_fixes.js`
2. Check `backend/logs/[date].log`
3. Review `TEST_REPORT.md`
4. Check Firebase Console for errors
5. Verify all environment variables in `.env`

---

**Last Updated:** May 8, 2026  
**Version:** 1.0.0
